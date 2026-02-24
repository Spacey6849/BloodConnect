import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

const compatibility: Record<string, string[]> = {
  'O+': ['O+','O-'],
  'O-': ['O-'],
  'A+': ['O+','O-','A+','A-'],
  'A-': ['O-','A-'],
  'B+': ['O+','O-','B+','B-'],
  'B-': ['O-','B-'],
  'AB+': ['O+','O-','A+','A-','B+','B-','AB+','AB-'],
  'AB-': ['O-','A-','B-','AB-']
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const requestType = String(url.searchParams.get('requestType') || '')
    const bankId = params.id
    if (!bankId) return NextResponse.json({ error: 'Missing bank id' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: me } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!me || me.role !== 'hospital') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: inv, error } = await admin
      .from('blood_inventory')
      .select('blood_type, quantity, expiry_date')
      .eq('blood_bank_id', bankId)
      .order('blood_type', { ascending: true })
    if (error) throw error

    const allowed = requestType && compatibility[requestType] ? new Set(compatibility[requestType]) : undefined
    const items = (inv || []).map(row => ({
      bloodType: row.blood_type as string,
      quantity: row.quantity as number,
      expiresAt: (row as any).expiry_date as string | null,
      compatible: allowed ? allowed.has(row.blood_type as string) : false
    }))
    return NextResponse.json({ items })
  } catch (e) {
    console.error('GET /api/banks/[id]/inventory', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
