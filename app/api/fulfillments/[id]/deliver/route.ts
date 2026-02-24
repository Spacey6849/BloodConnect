import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
  const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
  if (!me || me.role !== 'hospital') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const fid = params.id
    if (!fid) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Ensure the fulfillment exists and belongs to this bank
  const { data: frow, error: fErr } = await admin.from('request_fulfillments').select('id, blood_bank_id, hospital_id, delivered, units, blood_type, request_id').eq('id', fid).maybeSingle()
    if (fErr) throw fErr
    if (!frow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (frow.hospital_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (frow.delivered) return NextResponse.json({ ok: true, alreadyDelivered: true })

    const now = new Date().toISOString()
    // Mark delivered = true, set delivered_at
    const { error: updErr } = await admin.from('request_fulfillments').update({ delivered: true, delivered_at: now }).eq('id', fid)
    if (updErr) throw updErr

    // Let DB triggers handle units_fulfilled bumping and any inventory hooks
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('deliver error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
