import { NextResponse } from 'next/server'

const store = global as unknown as { _otp?: Record<string, { code: string; expiresAt: number }> }
store._otp = store._otp ?? {}

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    if (!email || !code) return NextResponse.json({ error: 'email and code required' }, { status: 400 })

    const record = store._otp![email]
    if (!record) return NextResponse.json({ error: 'no code requested' }, { status: 400 })
    if (record.expiresAt < Date.now()) return NextResponse.json({ error: 'code expired' }, { status: 400 })
    if (record.code !== code) return NextResponse.json({ error: 'invalid code' }, { status: 400 })

    delete store._otp![email]
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}
