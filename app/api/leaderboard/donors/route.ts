import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin()

    const url = new URL(req.url)
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100))

    // Base metrics
    const { data: metrics, error } = await admin
      .from('donor_engagement_metrics')
      .select('*')
    if (error) console.error('leaderboard metrics error', error)

    let rows = (metrics || []).map(m => {
      const total = Math.max(1, Number(m.alerts_total) || 0)
      const reliability = (Number(m.accepts) || 0) / total
      const responsiveness = m.avg_response_seconds == null ? 0.5 : Math.max(0, Math.min(1, (3600 - m.avg_response_seconds) / 3600))
      const donation = Math.max(0, Math.min(1, (Number(m.donations_last_12m) || 0) / 3 + (Number(m.donations_total_ever) || 0) / 20))
      const score = 0.4 * reliability + 0.35 * responsiveness + 0.25 * donation
      const donationCount = Number(m.donations_total_ever) || 0
      return { donorId: m.donor_id, reliability, responsiveness, donation, score, donationCount }
    })
    // Fallback to RPC aggregation if metrics are empty
    if (!rows.length) {
      const { data: agg, error: rpcErr } = await admin.rpc('get_top_donors', { p_limit: limit })
      if (rpcErr) console.error('get_top_donors RPC error', rpcErr)
      if (agg && agg.length) {
        rows = agg.map((a: any) => ({ donorId: a.donor_id, donationCount: Number(a.donations_count) || 0, score: 0, reliability: 0, responsiveness: 0, donation: 0 }))
      }
    }
    // Fallback to users ordered by donation_count
    let profileById: Record<string, { name: string; bloodType?: string | null; phone?: string | null; donationCount?: number }> = {}
    if (!rows.length) {
      const { data: donors } = await admin
        .from('users')
        .select('id, name, blood_type, phone, donation_count')
        .eq('role', 'donor')
        .order('donation_count', { ascending: false })
        .limit(limit)
      rows = (donors || []).map(u => ({ donorId: u.id, donationCount: Number(u.donation_count) || 0, score: 0, reliability: 0, responsiveness: 0, donation: Math.min(1, (Number(u.donation_count) || 0) / 20) }))
      for (const u of donors || []) profileById[u.id] = { name: u.name, bloodType: u.blood_type, phone: u.phone, donationCount: u.donation_count }
    }
    // Sort primarily by donations count (Top Donors), then by overall engagement score as tie-breaker
    rows.sort((a, b) => (b.donationCount - a.donationCount) || (b.score - a.score))

    // hydrate basic donor profile
    const donorIds = rows.slice(0, limit).map(r => r.donorId)
    if (donorIds.length) {
      const missingProfileIds = donorIds.filter(id => !profileById[id])
      if (missingProfileIds.length) {
        const { data: users } = await admin.from('users').select('id, name, blood_type, phone').in('id', missingProfileIds as any)
        for (const u of users || []) profileById[u.id] = { name: u.name, bloodType: u.blood_type, phone: u.phone }
      }
    }

    const out = rows.slice(0, limit).map(r => ({
      donorId: r.donorId,
      name: profileById[r.donorId]?.name || 'Donor',
      bloodType: profileById[r.donorId]?.bloodType || null,
      phone: profileById[r.donorId]?.phone || null,
      score: r.score,
      donationCount: r.donationCount,
      breakdown: { reliability: r.reliability, responsiveness: r.responsiveness, donation: r.donation }
    }))
    return NextResponse.json({ donors: out }, { status: 200 })
  } catch (e) {
    console.error('GET /api/leaderboard/donors', e)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
