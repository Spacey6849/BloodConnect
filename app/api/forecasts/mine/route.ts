import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['hospital','blood-bank'].includes(session.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('demand_forecasts')
      .select('blood_type, horizon, units, computed_at')
      .eq('entity_id', session.sub)
      .eq('entity_role', session.role)
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
