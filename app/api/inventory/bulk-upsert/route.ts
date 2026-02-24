import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value
    const session = token ? await verifySession(token) : null
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (session.role !== 'blood-bank') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const { items } = await req.json()
    if (!Array.isArray(items)) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

    // Prepare upsert rows, ignoring zero quantities by deleting those rows instead
    const admin = supabaseAdmin()

    const upserts = items.filter((x: any) => typeof x.quantity === 'number' && x.quantity > 0).map((x: any) => ({
      blood_bank_id: session.sub,
      blood_type: x.blood_type,
      quantity: x.quantity,
      expiry_date: x.expiry_date,
      last_updated: new Date().toISOString()
    }))

    // Delete entries where quantity 0 (for this bank), by blood_type
    const zeros = items.filter((x: any) => !x.quantity || x.quantity <= 0).map((x: any) => x.blood_type)
    if (zeros.length) {
      const { error: delErr } = await admin
        .from('blood_inventory')
        .delete()
        .eq('blood_bank_id', session.sub)
        .in('blood_type', zeros)
      if (delErr) throw delErr
    }

    if (upserts.length) {
      const { error } = await admin
        .from('blood_inventory')
        .upsert(upserts, { onConflict: 'blood_bank_id,blood_type' })
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}
