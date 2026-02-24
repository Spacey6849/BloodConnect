import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'blood-bank') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const donorId = params.id
    if (!donorId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: donor, error: dErr } = await admin.from('users').select('id, role').eq('id', donorId).maybeSingle()
    if (dErr) throw dErr
    if (!donor || donor.role !== 'donor') return NextResponse.json({ error: 'Donor not found' }, { status: 404 })

    const { error: upErr } = await admin
      .from('donor_verifications')
      .upsert({ blood_bank_id: me.id, donor_id: donorId, verified: true }, { onConflict: 'blood_bank_id,donor_id' })
    if (upErr) throw upErr

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('verify donor error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'blood-bank') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const donorId = params.id
    if (!donorId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error: delErr } = await admin
      .from('donor_verifications')
      .delete()
      .eq('blood_bank_id', me.id)
      .eq('donor_id', donorId)
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('unverify donor error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
