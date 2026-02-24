import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { SESSION_COOKIE, signSession, cookieOptions } from '@/lib/auth/jwt'

export async function POST(req: Request) {
  try {
  const { email, password, role, name, blood_type, phone, address, latitude, longitude } = await req.json()
    if (!email || !password || !role || !name) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: existing, error: selectErr } = await admin
      .from('users')
      .select('id, email, role, password_hash')
      .eq('email', email)
      .maybeSingle()
    if (selectErr) throw selectErr
    if (existing) {
      // If the account already exists and the provided password matches, sign the user in instead of failing
      const ok = await bcrypt.compare(password, (existing as any).password_hash)
      if (!ok) {
        return NextResponse.json({ error: 'email already registered' }, { status: 409 })
      }
      const token = await signSession({ sub: existing.id, email: existing.email, role: (existing as any).role })
      const res = NextResponse.json({ ok: true, existing: true })
      res.cookies.set(SESSION_COOKIE, token, cookieOptions())
      return res
    }

    const password_hash = await bcrypt.hash(password, 10)
    const { data: inserted, error: insertErr } = await admin
      .from('users')
  .insert({ email, password_hash, role, name, blood_type: blood_type ?? null, phone: phone ?? null, address: address ?? null, is_available: role === 'donor', latitude: latitude ?? null, longitude: longitude ?? null })
      .select('id, email, role')
      .single()
    if (insertErr) throw insertErr

  const token = await signSession({ sub: inserted.id, email: inserted.email, role: inserted.role as any })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, token, cookieOptions())
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}
