import { NextResponse } from 'next/server'
import { SESSION_COOKIE, cookieOptions } from '@/lib/auth/jwt'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  const opts = cookieOptions()
  res.cookies.set(SESSION_COOKIE, '', { ...opts, maxAge: 0 })
  return res
}
