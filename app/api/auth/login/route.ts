import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { SESSION_COOKIE, signSession, cookieOptions } from '@/lib/auth/jwt'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: user, error } = await admin
      .from('users')
      .select('id, email, role, password_hash')
      .eq('email', email)
      .maybeSingle()
    if (error) throw error
    if (!user) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })

  const token = await signSession({ sub: user.id, email: user.email, role: user.role as any })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, token, cookieOptions())
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}
