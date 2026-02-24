import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: me } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!me || me.role !== 'hospital') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const requestId = params.id
    const body = await req.json().catch(() => ({} as any))
    const bankId = String(body.bankId || '')
    const units = Number(body.units || 0)
    const requestedType: string | undefined = typeof body.bloodType === 'string' ? body.bloodType : undefined
    if (!requestId || !bankId || !Number.isFinite(units) || units <= 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Load request
    const { data: reqRow } = await admin
      .from('emergency_requests')
      .select('id, blood_type, units_needed, units_fulfilled, status, hospital_id')
      .eq('id', requestId)
      .maybeSingle()
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (reqRow.status !== 'pending') return NextResponse.json({ error: 'Request not pending' }, { status: 400 })
    if (reqRow.hospital_id !== me.id) return NextResponse.json({ error: 'Cannot use for another hospital request' }, { status: 403 })

    // Remaining units guard
    const remaining = Math.max(0, (reqRow.units_needed as number) - ((reqRow.units_fulfilled as number) || 0))
    const toUse = Math.min(units, remaining)
    if (toUse <= 0) return NextResponse.json({ error: 'Nothing to fulfill' }, { status: 400 })

    // Check bank role and stock via RPC decrement
    const { data: bankRow } = await admin.from('users').select('id, role').eq('id', bankId).maybeSingle()
    if (!bankRow || bankRow.role !== 'blood-bank') return NextResponse.json({ error: 'Target is not a blood bank' }, { status: 400 })

  // Compatibility mapping for substitution if primary type not in stock
    const compatibility: Record<string, string[]> = {
      'O+': ['O+','O-'],
      'O-': ['O-'],
      'A+': ['O+','O-','A+','A-'],
      'A-': ['O-','A-'],
      'B+': ['O+','O-','B+','B-'],
      'B-': ['O-','B-'],
      'AB+': ['O+','O-','A+','A-','B+','B-','AB+','AB-'],
      'AB-': ['O-','A-','B-','AB-']
    }

    // If there is already an undelivered fulfillment from this bank for this request,
    // do NOT decrement inventory again or add units (prevents double counting and double deduction).
    const { data: preExisting, error: preSelErr } = await admin
      .from('request_fulfillments')
      .select('id, units, blood_type')
      .eq('request_id', requestId)
      .eq('blood_bank_id', bankId)
      .eq('delivered', false)
      .limit(1)
      .maybeSingle()
    if (preSelErr) throw preSelErr
    if (preExisting?.id) {
      // No-op but return success to keep UX smooth
      await admin.from('notifications').insert({
        user_id: bankId,
        title: 'Hospital confirmed your response',
        message: `Hospital confirmed ${preExisting.units} reserved units for request ${requestId}. Coordinate delivery when ready.`,
        type: 'request_update',
        data: { request_id: requestId },
        created_at: new Date().toISOString()
      })
      return NextResponse.json({ ok: true, units: preExisting.units, note: 'Existing response confirmed; no additional stock deducted.' })
    }

    const tryTypes = [reqRow.blood_type as string, ...((compatibility[reqRow.blood_type as string] || []).filter(t => t !== reqRow.blood_type))]
    let chosenType: string | null = null
    let decOk: any = null
    let rpcErr: any = null

    if (requestedType) {
      // Enforce that the requestedType is compatible with the request blood type
      if (!tryTypes.includes(requestedType)) {
        return NextResponse.json({ error: 'Selected blood type is not compatible' }, { status: 400 })
      }
      const { data, error } = await admin.rpc('decrement_inventory', { p_bank_id: bankId, p_blood_type: requestedType, p_units: toUse })
      if (error) throw error
      if (!data) return NextResponse.json({ error: 'Insufficient stock in bank for selected type' }, { status: 409 })
      chosenType = requestedType
      decOk = data
    } else {
      // Backward-compatibility: auto-pick a compatible type based on availability
      for (const t of tryTypes) {
        const { data, error } = await admin.rpc('decrement_inventory', { p_bank_id: bankId, p_blood_type: t, p_units: toUse })
        if (!error && data) { chosenType = t; decOk = data; break }
        rpcErr = rpcErr || error
      }
      if (rpcErr) throw rpcErr
      if (!decOk) return NextResponse.json({ error: 'Insufficient stock in bank' }, { status: 409 })
    }

    // Merge into existing undelivered fulfillment to avoid duplicates
    const { data: existing, error: selErr } = await admin
      .from('request_fulfillments')
      .select('id, units')
      .eq('request_id', requestId)
      .eq('blood_bank_id', bankId)
      .eq('blood_type', chosenType || reqRow.blood_type)
      .eq('delivered', false)
      .limit(1)
      .maybeSingle()
    if (selErr) throw selErr

    if (existing?.id) {
      const newUnits = (existing.units as number) + toUse
      const { error: updErr } = await admin
        .from('request_fulfillments')
        .update({ units: newUnits })
        .eq('id', existing.id as any)
      if (updErr) throw updErr
    } else {
      // Insert a fulfillment owned by the bank but delivered=false (physical handoff to be confirmed by hospital)
      const { error: insErr } = await admin.from('request_fulfillments').insert({
        request_id: requestId,
        hospital_id: me.id,
        blood_bank_id: bankId,
        blood_type: chosenType || reqRow.blood_type,
        units: toUse,
        delivered: false
      })
      if (insErr) throw insErr
    }

    // Notify the bank that hospital initiated a transfer
    await admin.from('notifications').insert({
      user_id: bankId,
      title: 'Hospital used your stock',
      message: `Hospital initiated ${toUse} units of ${chosenType || reqRow.blood_type} for request ${requestId}. Please coordinate delivery.`,
      type: 'request_update',
      data: { request_id: requestId },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ ok: true, units: toUse })
  } catch (e) {
    console.error('POST /api/requests/[id]/use-bank', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
