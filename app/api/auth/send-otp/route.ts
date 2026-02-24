import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/mail/transport'

// Simple in-memory store during dev. Replace with Redis or DB in production.
const store = global as unknown as { _otp?: Record<string, { code: string; expiresAt: number }> }
store._otp = store._otp ?? {}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000

    store._otp![email] = { code, expiresAt }
    await sendVerificationEmail(email, code)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ ok: true })
}
