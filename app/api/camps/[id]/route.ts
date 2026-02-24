import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value
    const session = token ? await verifySession(token) : null
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()

    // Verify camp exists and belongs to the requester
    const { data: camp, error: campErr } = await admin
      .from('blood_camps')
      .select('id, organizer_id')
      .eq('id', params.id)
      .maybeSingle()
    if (campErr) throw campErr
    if (!camp) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (camp.organizer_id !== session.sub) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // Delete the camp; registrations are ON DELETE CASCADE in schema
    const { error: delErr } = await admin
      .from('blood_camps')
      .delete()
      .eq('id', params.id)
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}
