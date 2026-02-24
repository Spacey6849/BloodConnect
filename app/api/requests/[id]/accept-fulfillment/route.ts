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
    if (!requestId || !bankId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const { data: reqRow } = await admin
      .from('emergency_requests')
      .select('id, hospital_id, status')
      .eq('id', requestId).maybeSingle()
    if (!reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (reqRow.hospital_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!['pending','fulfilled'].includes(reqRow.status as any)) {
      return NextResponse.json({ error: 'Request not approvable' }, { status: 400 })
    }

    // Find latest undelivered fulfillment from this bank for this request
    const { data: f } = await admin
      .from('request_fulfillments')
      .select('id, accepted_by_hospital')
      .eq('request_id', requestId)
      .eq('blood_bank_id', bankId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!f) return NextResponse.json({ error: 'No fulfillment to accept' }, { status: 404 })
    if ((f as any).accepted_by_hospital) return NextResponse.json({ ok: true, alreadyAccepted: true })

    const { error: updErr } = await admin
      .from('request_fulfillments')
      .update({ accepted_by_hospital: true, accepted_at: new Date().toISOString() })
      .eq('id', (f as any).id)
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/requests/[id]/accept-fulfillment', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
