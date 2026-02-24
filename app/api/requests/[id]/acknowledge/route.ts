import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'hospital') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: reqRow, error: reqErr } = await admin
      .from('emergency_requests')
      .select('id, hospital_id, approved_by, approved_at')
      .eq('id', id)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (reqRow.hospital_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!reqRow.approved_by) return NextResponse.json({ error: 'Not approved yet' }, { status: 400 })

    const now = new Date().toISOString()
    const { error: updErr } = await admin
      .from('emergency_requests')
      .update({ hospital_acknowledged_at: now })
      .eq('id', id)
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('acknowledge error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
