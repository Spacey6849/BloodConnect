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
    const radiusMeters = parseFloat(url.searchParams.get('radiusMeters') || '10000')

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
    }
    if (!bloodType || !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(bloodType)) {
      return NextResponse.json({ error: 'Invalid bloodType' }, { status: 400 })
    }
    const radius = Number.isFinite(radiusMeters) ? Math.max(500, Math.min(radiusMeters, 50000)) : 10000

    const admin = supabaseAdmin()

    const { data, error } = await admin
      .rpc('nearby_blood_banks', { lat, long: lng, req_blood_type: bloodType, max_distance_meters: radius })
    if (error) throw error

    const result = (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      totalQuantity: b.total_quantity,
      distanceMeters: b.distance,
      latitude: b.latitude,
      longitude: b.longitude,
    }))

    return NextResponse.json({ banks: result }, { status: 200 })
  } catch (e) {
    console.error('GET /api/nearby/banks', e)
    return NextResponse.json({ error: 'Failed to load nearby banks' }, { status: 500 })
  }
}
