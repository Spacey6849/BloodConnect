import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin
      .from('users')
      .select('id, role, blood_type, eligible_date, is_available, name')
      .eq('id', session.sub)
      .maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'donor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { bankId, units, bloodType } = await req.json()
    if (!bankId || typeof bankId !== 'string') return NextResponse.json({ error: 'bankId required' }, { status: 400 })
    const bt = String(bloodType || me.blood_type || '').toUpperCase()
    if (!bt || !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(bt)) return NextResponse.json({ error: 'invalid bloodType' }, { status: 400 })
    const qty = Number(units)
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10) return NextResponse.json({ error: 'invalid units' }, { status: 400 })

    const now = new Date()
    const eligible = !me.eligible_date || new Date(me.eligible_date) <= now
    if (!eligible || me.is_available === false) return NextResponse.json({ error: 'Not eligible to donate right now' }, { status: 400 })

    // Validate bank exists and role
    const { data: bank } = await admin.from('users').select('id, role, name').eq('id', bankId).maybeSingle()
    if (!bank || bank.role !== 'blood-bank') return NextResponse.json({ error: 'Invalid blood bank' }, { status: 400 })

    // 1) Insert donation_history with source='donor'
    const { error: insErr } = await admin
      .from('donation_history')
      .insert({ donor_id: me.id, blood_bank_id: bankId, hospital_id: null, request_id: null, donation_date: new Date().toISOString(), blood_type: bt, units_contributed: qty, source: 'donor' })
    if (insErr) throw insErr

    // 2) Increment inventory at bank (upsert or add to existing)
    // Try to fetch current quantity to compute new value; fallback to upsert
    const { data: inv } = await admin.from('blood_inventory').select('quantity').eq('blood_bank_id', bankId).eq('blood_type', bt).maybeSingle()
    if (inv && typeof inv.quantity === 'number') {
      const { error: upErr } = await admin
        .from('blood_inventory')
        .update({ quantity: inv.quantity + qty, last_updated: new Date().toISOString() })
        .eq('blood_bank_id', bankId)
        .eq('blood_type', bt)
      if (upErr) throw upErr
    } else {
      const { error: upsertErr } = await admin
        .from('blood_inventory')
        .upsert({ blood_bank_id: bankId, blood_type: bt, quantity: qty, expiry_date: new Date(Date.now() + 42*24*3600*1000).toISOString().slice(0,10), last_updated: new Date().toISOString() }, { onConflict: 'blood_bank_id,blood_type' })
      if (upsertErr) throw upsertErr
    }

    // 3) Notify bank
    await admin.from('notifications').insert({
      user_id: bankId,
      title: 'New donation recorded',
      message: `${me.name || 'A donor'} donated ${qty} unit(s) of ${bt}.`,
      type: 'status_update',
      data: { donor_id: me.id, blood_type: bt, units: qty }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('POST /api/donate', e)
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}
