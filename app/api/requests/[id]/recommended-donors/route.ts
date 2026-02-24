import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'
import { DonorRecommendation, BloodType } from '@/lib/types'

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()

    // Must be hospital or blood-bank
    const { data: viewer } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!viewer || (viewer.role !== 'hospital' && viewer.role !== 'blood-bank')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load request
    const requestId = params.id
    const { data: reqRow, error: reqErr } = await admin
      .from('emergency_requests')
      .select('id, blood_type, units_needed, urgency, hospital_id')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const bloodType = reqRow.blood_type as BloodType

    // Use hospital coordinates for the request location
    const { data: hosp } = await admin
      .from('users')
      .select('id, latitude, longitude')
      .eq('id', reqRow.hospital_id as string)
      .maybeSingle()

    const lat = (hosp as any)?.latitude
    const lng = (hosp as any)?.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Request location unavailable' }, { status: 400 })
    }

    // Nearby eligible donors (5km) using RPC
    const { data: nearby, error: rpcErr } = await admin
      .rpc('nearby_donors', { lat, long: lng, req_blood_type: bloodType, max_distance_meters: 5000 })
    if (rpcErr) throw rpcErr

  const donorIds = (nearby || []).map((d: any) => d.id)
    // Restrict to verified donors (by any blood bank)
    let verifiedSet = new Set<string>()
    if (donorIds.length) {
      const { data: verRows } = await admin
        .from('donor_verifications')
        .select('donor_id, verified')
        .eq('verified', true)
        .in('donor_id', donorIds as any)
      for (const v of verRows || []) verifiedSet.add(v.donor_id)
    }

    // Engagement metrics
    let metricsById: Record<string, any> = {}
    if (donorIds.length) {
      const { data: metrics } = await admin
        .from('donor_engagement_metrics')
        .select('*')
        .in('donor_id', donorIds as any)
      for (const m of metrics || []) metricsById[m.donor_id] = m
    }
    // Donation counts
    let donationCountById: Record<string, number> = {}
    if (donorIds.length) {
      const { data: counts } = await admin
        .from('donation_history')
        .select('donor_id, id')
        .in('donor_id', donorIds as any)
      const map: Record<string, number> = {}
      for (const r of counts || []) map[r.donor_id] = (map[r.donor_id] || 0) + 1
      donationCountById = map
    }

    // Scoring weights
    const urgency = (reqRow.urgency as 'critical'|'urgent'|'normal') || 'urgent'
    const W = {
      distance: 0.35,
      reliability: 0.3,
      responsiveness: urgency === 'critical' ? 0.28 : urgency === 'urgent' ? 0.22 : 0.18,
      donationHistory: 0.12,
      urgencyBoost: urgency === 'critical' ? 0.1 : urgency === 'urgent' ? 0.05 : 0
    }

    const recommendations: DonorRecommendation[] = (nearby || [])
      .filter((d: any) => verifiedSet.has(d.id))
      .map((d: any) => {
      const m = metricsById[d.id] || {}
      const distanceMeters = d.distance as number
      const distanceKm = distanceMeters / 1000
      const distanceScore = clamp(1 - (distanceKm / 5), 0, 1) // 5km radius

      const total = Math.max(1, Number(m.alerts_total) || 0)
      const accepts = Number(m.accepts) || 0
      const declines = Number(m.declines) || 0
      const timeouts = Number(m.timeouts) || 0
      const reliabilityRate = accepts / total
      const reliabilityScore = clamp(reliabilityRate - 0.2 * (declines / total) - 0.3 * (timeouts / total), 0, 1)

      const avgResp = m.avg_response_seconds as number | null
      let responsivenessScore = 0.5
      if (avgResp != null) {
        // Under 10m -> 1.0, over 60m -> 0.1
        const minS = 10 * 60, maxS = 60 * 60
        const t = clamp((maxS - avgResp) / (maxS - minS), 0, 1)
        responsivenessScore = 0.1 + 0.9 * t
      }

      const donationsTotalEver = Number(m.donations_total_ever) || 0
      const donations12m = Number(m.donations_last_12m) || 0
      const donationHistoryScore = clamp((donations12m / 3) + (donationsTotalEver / 20), 0, 1)

      const urgencyBoost = W.urgencyBoost

      const score =
        W.distance * distanceScore +
        W.reliability * reliabilityScore +
        W.responsiveness * responsivenessScore +
        W.donationHistory * donationHistoryScore +
        urgencyBoost

      const rec: DonorRecommendation = {
        id: d.id,
        name: d.name,
        bloodType: d.blood_type,
        phone: d.phone,
        distanceMeters,
        eligible: d.is_available && (!d.eligible_date || new Date(d.eligible_date) <= new Date()),
        lastDonation: d.last_donation,
        eligibleDate: d.eligible_date,
        donationCount: donationCountById[d.id] || 0,
        metrics: {
          alertsTotal: total,
          accepts,
          declines,
          timeouts,
          avgResponseSeconds: m.avg_response_seconds ?? null,
          donationsTotalEver,
          donationsLast12m: donations12m
        },
        score,
        breakdown: {
          distance: distanceScore,
          reliability: reliabilityScore,
          responsiveness: responsivenessScore,
          donationHistory: donationHistoryScore,
          urgencyBoost
        }
      }
      return rec
    })

    recommendations.sort((a, b) => b.score - a.score)

    return NextResponse.json({ donors: recommendations }, { status: 200 })
  } catch (e) {
    console.error('GET /api/requests/[id]/recommended-donors', e)
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
  }
}
