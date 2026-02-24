import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value
    const session = token ? await verifySession(token) : null
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (session.role !== 'donor') return NextResponse.json({ error: 'only donors can register' }, { status: 403 })

    const admin = supabaseAdmin()
    // Get donor profile for name/email fallback
    const { data: user, error: userErr } = await admin
      .from('users')
      .select('id, name, email, phone')
      .eq('id', session.sub)
      .maybeSingle()
    if (userErr) throw userErr
    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    // Avoid duplicates by unique (camp_id, email)
    const { error } = await admin
      .from('blood_camp_registrations')
      .insert({ camp_id: params.id, user_id: session.sub, name: user.name, email: user.email, phone: user.phone ?? null })
    if (error) {
      if (String(error.message).toLowerCase().includes('duplicate')) {
        return NextResponse.json({ ok: true, duplicate: true })
      }
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}
