import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

// GET: bank lists a single submission (optional, mainly for debugging)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = supabaseAdmin()
    const { data, error } = await admin.from('donation_submissions').select('*').eq('id', params.id).maybeSingle()
    if (error) throw error
    return NextResponse.json({ submission: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}

// PATCH: bank accepts or declines a submission
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: me } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!me || me.role !== 'blood-bank') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action } = await req.json()
    if (!['accept','decline'].includes(String(action))) return NextResponse.json({ error: 'invalid action' }, { status: 400 })

    // Load submission (must belong to this bank and be pending)
    const { data: sub, error: subErr } = await admin
      .from('donation_submissions')
      .select('*')
      .eq('id', params.id)
      .eq('blood_bank_id', me.id)
      .maybeSingle()
    if (subErr) throw subErr
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sub.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 400 })

    if (action === 'decline') {
      const { error } = await admin
        .from('donation_submissions')
        .update({ status: 'declined', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
        .eq('id', sub.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // Accept: record donation_history (source='donor'), increment inventory, and update submission
    const bt = String(sub.blood_type)
    const qty = Number(sub.units)

    const { error: insErr } = await admin
      .from('donation_history')
      .insert({ donor_id: sub.donor_id, blood_bank_id: sub.blood_bank_id, hospital_id: null, request_id: null, donation_date: new Date().toISOString(), blood_type: bt, units_contributed: qty, source: 'donor' })
    if (insErr) throw insErr

    const { data: inv } = await admin.from('blood_inventory').select('quantity').eq('blood_bank_id', sub.blood_bank_id).eq('blood_type', bt).maybeSingle()
    if (inv && typeof inv.quantity === 'number') {
      const { error: upErr } = await admin
        .from('blood_inventory')
        .update({ quantity: inv.quantity + qty, last_updated: new Date().toISOString() })
        .eq('blood_bank_id', sub.blood_bank_id)
        .eq('blood_type', bt)
      if (upErr) throw upErr
    } else {
      const { error: upsertErr } = await admin
        .from('blood_inventory')
        .upsert({ blood_bank_id: sub.blood_bank_id, blood_type: bt, quantity: qty, expiry_date: new Date(Date.now() + 42*24*3600*1000).toISOString().slice(0,10), last_updated: new Date().toISOString() }, { onConflict: 'blood_bank_id,blood_type' })
      if (upsertErr) throw upsertErr
    }

    const { error: updErr } = await admin
      .from('donation_submissions')
      .update({ status: 'accepted', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('PATCH /api/donations/submissions/[id]', e)
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}
