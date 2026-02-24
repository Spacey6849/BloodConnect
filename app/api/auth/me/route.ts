import { NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ user: null }, { status: 200 })

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('users')
  .select('id, role, name, email, phone, blood_type, latitude, longitude, address, is_available')
      .eq('id', session.sub)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ user: data }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
