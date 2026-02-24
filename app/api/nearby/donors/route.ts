import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const lat = parseFloat(url.searchParams.get('lat') || '')
    const lng = parseFloat(url.searchParams.get('lng') || '')
    const bloodType = url.searchParams.get('bloodType') || ''
    const radiusMeters = parseFloat(url.searchParams.get('radiusMeters') || '5000')

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
    }
    if (!bloodType || !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(bloodType)) {
      return NextResponse.json({ error: 'Invalid bloodType' }, { status: 400 })
    }
    const radius = Number.isFinite(radiusMeters) ? Math.max(500, Math.min(radiusMeters, 50000)) : 5000

    const admin = supabaseAdmin()

    // Optional role check: only blood banks can query verified donors nearby
    const { data: viewer } = await admin
      .from('users')
      .select('id, role')
      .eq('id', session.sub)
      .maybeSingle()
    if (viewer?.role !== 'blood-bank') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use RPC or SQL function call via PostgREST
    const { data, error } = await admin
      .rpc('nearby_donors', { lat, long: lng, req_blood_type: bloodType, max_distance_meters: radius })

    if (error) throw error

    // Filter to only verified donors (by any blood bank) and include which bank(s)
    const donorIds = (data || []).map((d: any) => d.id)
    let verifiedSet = new Set<string>()
    let byDonor: Record<string, Array<{ bank_id: string; verified_at: string }>> = {}
    let bankNameById = new Map<string, string>()
    if (donorIds.length) {
      const { data: verRows } = await admin
        .from('donor_verifications')
        .select('donor_id, blood_bank_id, verified_at, verified')
        .eq('verified', true)
        .in('donor_id', donorIds as any)
      for (const v of verRows || []) {
        verifiedSet.add(v.donor_id)
        if (!byDonor[v.donor_id]) byDonor[v.donor_id] = []
        byDonor[v.donor_id].push({ bank_id: v.blood_bank_id, verified_at: v.verified_at })
      }
      const bankIds = Array.from(new Set((verRows || []).map(v => v.blood_bank_id)))
      if (bankIds.length) {
        const { data: banks } = await admin
          .from('users')
          .select('id, name')
          .in('id', bankIds as any)
        for (const b of banks || []) bankNameById.set(b.id, b.name)
      }
    }

    const result = (data || [])
      .filter((d: any) => verifiedSet.has(d.id))
      .map((d: any) => {
        const verList = (byDonor[d.id] || [])
          .map(v => ({ id: v.bank_id, name: bankNameById.get(v.bank_id) || 'Blood Bank', verified_at: v.verified_at }))
          .sort((a, b) => (new Date(b.verified_at).getTime()) - (new Date(a.verified_at).getTime()))
        return {
          id: d.id,
          name: d.name,
          bloodType: d.blood_type,
          phone: d.phone,
          distanceMeters: d.distance,
          latitude: d.latitude,
          longitude: d.longitude,
          isAvailable: d.is_available,
          lastDonation: d.last_donation,
          eligibleDate: d.eligible_date,
          verifiedByBanks: verList,
          verifiedByPrimary: verList[0]?.name || null
        }
      })

    return NextResponse.json({ donors: result }, { status: 200 })
  } catch (e) {
    console.error('GET /api/nearby/donors', e)
    return NextResponse.json({ error: 'Failed to load nearby donors' }, { status: 500 })
  }
}
