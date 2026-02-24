import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

// Bank list submissions by query
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()

    const url = new URL(req.url)
    const bankId = url.searchParams.get('bankId') || session.sub
    const status = url.searchParams.get('status') || 'pending'

    const { data: me } = await admin.from('users').select('id, role').eq('id', session.sub).maybeSingle()
    if (!me || me.role !== 'blood-bank') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await admin
      .from('donation_submissions')
      .select('id, donor_id, blood_bank_id, blood_type, units, submitted_at, status')
      .eq('blood_bank_id', bankId)
      .eq('status', status)
      .order('submitted_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ submissions: data || [] })
  } catch (e: any) {
    console.error('GET /api/donations/submissions', e)
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}

// Donor creates a pending donation submission for a bank
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = supabaseAdmin()
    const { data: me } = await admin.from('users').select('id, role, blood_type').eq('id', session.sub).maybeSingle()
    if (!me || me.role !== 'donor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { bankId, units, bloodType, note } = await req.json()
    const bt = String(bloodType || me.blood_type || '').toUpperCase()
    const qty = Number(units)
    if (!bankId || typeof bankId !== 'string') return NextResponse.json({ error: 'bankId required' }, { status: 400 })
    if (!bt || !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(bt)) return NextResponse.json({ error: 'invalid bloodType' }, { status: 400 })
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10) return NextResponse.json({ error: 'invalid units' }, { status: 400 })

    const { data: bank } = await admin.from('users').select('id, role').eq('id', bankId).maybeSingle()
    if (!bank || bank.role !== 'blood-bank') return NextResponse.json({ error: 'Invalid blood bank' }, { status: 400 })

    const { error } = await admin.from('donation_submissions').insert({ donor_id: me.id, blood_bank_id: bankId, blood_type: bt, units: qty, note: note || null })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('POST /api/donations/submissions', e)
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}
