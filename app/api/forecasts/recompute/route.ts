import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST() {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['hospital','blood-bank'].includes(session.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const admin = supabaseAdmin()
    const { error } = await admin.rpc('materialize_simple_forecasts', { p_entity: session.sub, p_role: session.role })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to recompute' }, { status: 500 })
  }
}
