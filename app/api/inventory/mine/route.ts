import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value
    const session = token ? await verifySession(token) : null
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (session.role !== 'blood-bank') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('blood_inventory')
      .select('blood_type, quantity, expiry_date, last_updated')
      .eq('blood_bank_id', session.sub)
      .order('blood_type', { ascending: true })
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}
