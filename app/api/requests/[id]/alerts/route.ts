import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: viewer } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!viewer || (viewer.role !== 'hospital' && viewer.role !== 'blood-bank')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestId = params.id
    // Sweep: mark expired pending alerts as timeout
    await admin
      .from('donor_alerts')
      .update({ status: 'timeout' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending')
      .eq('creator_id', viewer.id)
      .eq('request_id', requestId)

    const { data, error } = await admin
      .from('donor_alerts')
      .select('id, donor_id, status, notified_at, response_at')
      .eq('request_id', requestId)
      .eq('creator_id', viewer.id)
      .order('notified_at', { ascending: false })
    if (error) throw error

    // hydrate donor name and contact
    const donorIds = Array.from(new Set((data || []).map(a => a.donor_id)))
    let donors: Record<string, { name: string; phone?: string | null }> = {}
    if (donorIds.length) {
      const { data: users } = await admin.from('users').select('id, name, phone').in('id', donorIds as any)
      for (const u of users || []) donors[u.id] = { name: u.name, phone: u.phone }
    }

    const out = (data || []).map(a => ({
      id: a.id,
      donorId: a.donor_id,
      donorName: donors[a.donor_id]?.name || 'Donor',
      donorPhone: donors[a.donor_id]?.phone || null,
      status: a.status,
      notifiedAt: a.notified_at,
      responseAt: a.response_at
    }))
    return NextResponse.json({ alerts: out }, { status: 200 })
  } catch (e) {
    console.error('GET /api/requests/[id]/alerts', e)
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 })
  }
}
