import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

type Body = { donorIds: string[]; expiresMinutes?: number }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: viewer } = await admin.from('users').select('id, role, name').eq('id', session.sub).maybeSingle()
    if (!viewer || (viewer.role !== 'hospital' && viewer.role !== 'blood-bank')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestId = params.id
    const body = (await req.json()) as Body
    const donorIds = Array.from(new Set((body.donorIds || []).filter(Boolean)))
    if (donorIds.length === 0) return NextResponse.json({ error: 'No donors provided' }, { status: 400 })

    const expiresMinutes = typeof body.expiresMinutes === 'number' ? Math.max(10, Math.min(body.expiresMinutes, 240)) : 60
    const expiresAt = new Date(Date.now() + expiresMinutes * 60_000).toISOString()

    // Validate request exists
    const { data: reqRow } = await admin
      .from('emergency_requests')
      .select('id, blood_type, units_needed, urgency, hospital_id')
      .eq('id', requestId)
      .maybeSingle()
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const rows = donorIds.map(id => ({ request_id: requestId, donor_id: id, creator_id: viewer.id, status: 'pending', expires_at: expiresAt }))
    const { data: alerts, error } = await admin.from('donor_alerts').upsert(rows, { onConflict: 'request_id,donor_id' }).select('id, donor_id')
    if (error) throw error

    // Create targeted notifications
    const notifies = (alerts || []).map(a => ({
      user_id: a.donor_id,
      title: 'Donation request near you',
      message: `${viewer.name} needs your help for ${reqRow.units_needed} units of ${reqRow.blood_type} (${reqRow.urgency}).`,
      type: 'emergency_request',
      data: { request_id: requestId, alert_id: a.id },
      created_at: new Date().toISOString()
    }))
    if (notifies.length) await admin.from('notifications').insert(notifies)

    // If creator is a blood bank, inform the hospital that donors were selected due to low inventory
    if (viewer.role === 'blood-bank' && reqRow?.hospital_id) {
      await admin.from('notifications').insert({
        user_id: reqRow.hospital_id,
        title: 'Donor(s) selected by blood bank',
        message: `${viewer.name} selected verified donor(s) due to low on-hand inventory.`,
        type: 'request_update',
        data: { request_id: requestId, donors_count: donorIds.length },
        created_at: new Date().toISOString()
      })
    }

    return NextResponse.json({ ok: true, count: alerts?.length || 0 }, { status: 200 })
  } catch (e) {
    console.error('POST /api/requests/[id]/notify-donors', e)
    return NextResponse.json({ error: 'Failed to notify donors' }, { status: 500 })
  }
}
