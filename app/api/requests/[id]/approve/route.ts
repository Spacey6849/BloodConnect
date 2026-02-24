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
  const { data: me, error: meErr } = await admin.from('users').select('id, role, name').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
  if (!me || me.role !== 'hospital') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Load request
    const { data: reqRow, error: reqErr } = await admin
      .from('emergency_requests')
      .select('id, status, hospital_id, approved_by, approved_at')
      .eq('id', id)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Allow approval for pending or fulfilled (fulfilled via deliveries) but not yet approved
    if (!['pending', 'fulfilled'].includes(reqRow.status as any)) {
      return NextResponse.json({ error: 'Request not approvable' }, { status: 400 })
    }
    if (reqRow.hospital_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (reqRow.approved_by) return NextResponse.json({ error: 'Already approved' }, { status: 400 })

    // Ensure at least one delivered fulfillment exists (physical delivery confirmed)
    const { count, error: cntErr } = await admin
      .from('request_fulfillments')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', id)
      .eq('delivered', true)
    if (cntErr) throw cntErr
  if (!count || count < 1) return NextResponse.json({ error: 'No delivered units to approve yet' }, { status: 400 })

    // Approve it (this triggers DB to write donation_history for delivered fulfillments)
    const now = new Date().toISOString()
    const { error: updErr } = await admin
      .from('emergency_requests')
      .update({ approved_by: me.id, approved_at: now })
      .eq('id', id)
    if (updErr) throw updErr

    // Notify all blood banks that delivered units for this request
    const { data: bbList, error: bbErr } = await admin
      .from('request_fulfillments')
      .select('blood_bank_id')
      .eq('request_id', id)
      .eq('delivered', true)
    if (bbErr) throw bbErr
    const uniqueBanks = Array.from(new Set((bbList || []).map(r => (r as any).blood_bank_id as string))).filter(Boolean)
    if (uniqueBanks.length) {
      const rows = uniqueBanks.map(bid => ({
        user_id: bid,
        title: 'Hospital approved the request',
        message: `${me.name || 'Hospital'} approved request ${id}. Your delivered units have been recorded.`,
        type: 'status_update',
        data: { request_id: id },
        created_at: now
      }))
      await admin.from('notifications').insert(rows)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('approve error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
