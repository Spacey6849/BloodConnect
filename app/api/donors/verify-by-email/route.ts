import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'blood-bank') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({} as any))
    const email = String(body?.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const { data: donor, error: dErr } = await admin
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()
    if (dErr) throw dErr
    if (!donor || donor.role !== 'donor') return NextResponse.json({ error: 'Donor not found' }, { status: 404 })

    // Upsert verification
    const { error: upErr } = await admin
      .from('donor_verifications')
      .upsert({ blood_bank_id: me.id, donor_id: donor.id, verified: true }, { onConflict: 'blood_bank_id,donor_id' })
    if (upErr) throw upErr

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('verify-by-email error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
