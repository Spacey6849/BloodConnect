import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

// PATCH /api/auth/profile
// body: { name?, phone?, address?, latitude?, longitude?, is_available? (donor only), blood_type? (donor only) }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const updates: any = {}

    if (typeof body.name === 'string') updates.name = body.name
    if (typeof body.phone === 'string') updates.phone = body.phone
    if (typeof body.address === 'string') updates.address = body.address
    if (Number.isFinite(body.latitude)) updates.latitude = Number(body.latitude)
    if (Number.isFinite(body.longitude)) updates.longitude = Number(body.longitude)

    // Only donors can update availability and blood_type
    if (body.is_available !== undefined || body.blood_type !== undefined) {
      const admin = supabaseAdmin()
      const { data: me } = await admin.from('users').select('role').eq('id', session.sub).maybeSingle()
      if ((me as any)?.role === 'donor') {
        if (typeof body.is_available === 'boolean') updates.is_available = body.is_available
        const validBT = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
        if (typeof body.blood_type === 'string' && validBT.includes(body.blood_type)) updates.blood_type = body.blood_type
      }
    }

    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

    const admin = supabaseAdmin()
    const { error } = await admin.from('users').update(updates).eq('id', session.sub)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update profile' }, { status: 500 })
  }
}
