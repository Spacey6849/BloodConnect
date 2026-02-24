import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

type Body = { action: 'accept' | 'decline' }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { action } = (await req.json()) as Body
    if (action !== 'accept' && action !== 'decline') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const admin = supabaseAdmin()
    const alertId = params.id
    const { data: alert } = await admin
      .from('donor_alerts')
      .select('id, donor_id, creator_id, request_id, status')
      .eq('id', alertId)
      .maybeSingle()
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    if (alert.donor_id !== session.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const newStatus = action === 'accept' ? 'accepted' : 'declined'
    const { error } = await admin
      .from('donor_alerts')
      .update({ status: newStatus, response_at: new Date().toISOString() })
      .eq('id', alertId)
    if (error) throw error

    // Notify creator
    await admin.from('notifications').insert({
      user_id: alert.creator_id,
      title: 'Donor response',
      message: `A donor has ${newStatus} your request notification.`,
      type: 'status_update',
      data: { request_id: alert.request_id, alert_id: alert.id, donor_id: alert.donor_id, status: newStatus },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/alerts/[id]/respond', e)
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 })
  }
}
