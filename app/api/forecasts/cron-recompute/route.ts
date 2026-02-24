import { NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentUserFromCookie } from '@/lib/supabase/server'

// Optional cron endpoint to recompute forecasts for the current user entity.
// In production, drive this via a job scheduler that calls /api/forecasts/recompute.
export async function POST() {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['hospital','blood-bank'].includes(session.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = supabaseAdmin()
    const { error } = await admin.rpc('materialize_simple_forecasts', { p_entity: session.sub, p_role: session.role })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
