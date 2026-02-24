import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'blood-bank') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Read payload: units to fulfill (defaults to full remaining)
    const body = await req.json().catch(() => ({} as any))
    const units = Number(body?.units)

    const { data: reqRow, error: reqErr } = await admin
      .from('emergency_requests')
      .select('id, status, fulfilled_by, units_needed, units_fulfilled, blood_type, hospital_id')
      .eq('id', id)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (reqRow.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })
    }

  const remaining = Math.max(0, (reqRow.units_needed as number) - (reqRow.units_fulfilled as number))
  const toFulfill = Number.isFinite(units) && units > 0 ? Math.min(units, remaining) : remaining
    if (toFulfill <= 0) return NextResponse.json({ error: 'Nothing to fulfill' }, { status: 400 })

    // Atomically decrement inventory for this blood bank
    const { data: decOk, error: rpcErr } = await admin.rpc('decrement_inventory', {
      p_bank_id: me.id,
      p_blood_type: reqRow.blood_type,
      p_units: toFulfill
    })
    if (rpcErr) throw rpcErr
    if (!decOk) return NextResponse.json({ error: 'Insufficient stock' }, { status: 409 })

    // Merge into existing undelivered fulfillment to avoid duplicates
    const { data: existing, error: selErr } = await admin
      .from('request_fulfillments')
      .select('id, units')
      .eq('request_id', reqRow.id)
      .eq('blood_bank_id', me.id)
      .eq('delivered', false)
      .limit(1)
      .maybeSingle()
    if (selErr) throw selErr

    if (existing?.id) {
      const newUnits = (existing.units as number) + toFulfill
      const { error: updErr } = await admin
        .from('request_fulfillments')
        .update({ units: newUnits })
        .eq('id', existing.id as any)
      if (updErr) throw updErr
    } else {
      // Record fulfillment row (not yet delivered)
      const { error: insFulErr } = await admin.from('request_fulfillments').insert({
        request_id: reqRow.id,
        hospital_id: reqRow.hospital_id,
        blood_bank_id: me.id,
        blood_type: reqRow.blood_type,
        units: toFulfill
      })
      if (insFulErr) throw insFulErr
    }

    // Do not mark request fulfilled yet; delivery and hospital approval will drive finalization
    return NextResponse.json({ ok: true, units: toFulfill })
  } catch (e: any) {
    console.error('respond error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
