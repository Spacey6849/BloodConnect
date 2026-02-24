import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const lat = parseFloat(url.searchParams.get('lat') || '')
    const lng = parseFloat(url.searchParams.get('lng') || '')
    const radiusMeters = parseFloat(url.searchParams.get('radiusMeters') || '10000')

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
    }
    const radius = Number.isFinite(radiusMeters) ? Math.max(500, Math.min(radiusMeters, 50000)) : 10000

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .rpc('nearby_hospitals', { lat, long: lng, max_distance_meters: radius })
    if (error) throw error

    const result = (data || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      phone: h.phone,
      distanceMeters: h.distance,
      latitude: h.latitude,
      longitude: h.longitude,
    }))

    return NextResponse.json({ hospitals: result }, { status: 200 })
  } catch (e) {
    console.error('GET /api/nearby/hospitals', e)
    return NextResponse.json({ error: 'Failed to load nearby hospitals' }, { status: 500 })
  }
}
