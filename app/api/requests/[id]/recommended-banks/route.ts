import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = supabaseAdmin()
    // Load request and hospital location
    const { data: reqRow, error: reqErr } = await admin
      .from('emergency_requests')
      .select('id, blood_type, hospital_id')
      .eq('id', id)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: hosp, error: hospErr } = await admin
      .from('users')
      .select('id, latitude, longitude')
      .eq('id', reqRow.hospital_id)
      .maybeSingle()
    if (hospErr) throw hospErr
    if (!hosp || typeof hosp.latitude !== 'number' || typeof hosp.longitude !== 'number') {
      return NextResponse.json({ banks: [] })
    }

    const { data, error } = await admin.rpc('nearby_blood_banks', {
      lat: hosp.latitude,
      long: hosp.longitude,
      req_blood_type: reqRow.blood_type,
      max_distance_meters: 20000
    })
    if (error) throw error

    const banks = (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      totalQuantity: b.total_quantity,
      distanceMeters: b.distance,
      latitude: b.latitude,
      longitude: b.longitude,
      // simple score: inventory weight with distance penalty
      score: (b.total_quantity || 0) * 1.0 - Math.min(1, (b.distance || 0) / 20000) * 0.2
    }))
      .sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({ banks })
  } catch (e) {
    console.error('recommended-banks error', e)
    return NextResponse.json({ banks: [] }, { status: 200 })
  }
}
