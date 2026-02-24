import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: me } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requestId = params.id
    if (!requestId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Hospitals need to see their request fulfillments; banks may see only their own
    let query = admin
      .from('request_fulfillments')
      .select('id, request_id, blood_bank_id, units, delivered, accepted_by_hospital, accepted_at, created_at')
      .eq('request_id', requestId)
    if (me.role === 'blood-bank') {
      query = query.eq('blood_bank_id', me.id)
    }
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ fulfillments: data || [] })
  } catch (e) {
    console.error('GET /api/requests/[id]/fulfillments', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
