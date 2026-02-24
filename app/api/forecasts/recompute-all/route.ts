import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST() {
  try {
    const header = process.env.CRON_SECRET
    if (!header) return NextResponse.json({ error: 'Server missing CRON_SECRET' }, { status: 500 })

    // Validate shared secret header for cron calls
    const reqHeaders = new Headers();
    // In Next.js App Router we can't directly read incoming headers in this function signature without NextRequest
    // So export another handler variant for edge if needed. Keep simple with URL-based secret fallback.
    return NextResponse.json({ error: 'Use GET with ?secret=... for cron' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}

// Allow calling via GET /api/forecasts/recompute-all?secret=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret')
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const admin = supabaseAdmin()
    // Fetch all hospital and blood-bank IDs
    const { data: users, error } = await admin
      .from('users')
      .select('id, role')
      .in('role', ['hospital', 'blood-bank'])
    if (error) throw error

    let ok = 0
    for (const u of users || []) {
      const { error: rpcErr } = await admin.rpc('materialize_simple_forecasts', { p_entity: u.id, p_role: u.role })
      if (!rpcErr) ok++
    }

    return NextResponse.json({ ok, total: (users || []).length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
