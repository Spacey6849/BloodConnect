import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'
import { sendNotificationEmail } from '@/lib/mail/notify'
import { sendExpoPush } from '@/lib/push/expo'

export async function GET() {
  try {
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('blood_camps')
      .select('id, name, description, address, start_date, end_date, banner_url, contact_phone, contact_email, capacity_target, registered_count, status, latitude, longitude, organizer_id')
      .gte('end_date', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('start_date', { ascending: true })
    if (error) throw error
    return NextResponse.json({ camps: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value
    const session = token ? await verifySession(token) : null
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (!['ngo', 'hospital'].includes(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      name, description, address,
      start_date, end_date,
      banner_url, contact_phone, contact_email,
      capacity_target,
      latitude, longitude
    } = body

    if (!name || !address || !start_date || !end_date) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('blood_camps')
      .insert({
        organizer_id: session.sub,
        name, description: description ?? null, address,
        start_date, end_date,
        banner_url: banner_url ?? null,
        contact_phone: contact_phone ?? null,
        contact_email: contact_email ?? null,
        capacity_target: capacity_target ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null
      })
      .select('id')
      .single()
    if (error) throw error

    // Notify NGOs and nearby donors about the new camp
    try {
      const subj = `New Blood Camp: ${name}`
      const timeStr = `${new Date(start_date).toLocaleString()} - ${new Date(end_date).toLocaleString()}`
      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
          <h2>${name}</h2>
          <p>${description || ''}</p>
          <p><strong>When:</strong> ${timeStr}</p>
          <p><strong>Where:</strong> ${address}</p>
        </div>
      `
      // NGOs (broadcast)
      const { data: ngos } = await admin.from('users').select('email, expo_push_token').eq('role','ngo')
      const ngoEmails = (ngos || []).map(n => n.email).filter(Boolean) as string[]
      const ngoPushes = (ngos || []).map(n => n.expo_push_token).filter(Boolean) as string[]
      if (ngoEmails.length) await sendNotificationEmail(ngoEmails, subj, html)
      if (ngoPushes.length) await sendExpoPush(ngoPushes.map(to => ({ to, title: 'Blood camp announced', body: `${name} at ${address} • ${timeStr}`, data: { campId: data.id } })))

      // Nearby donors (optional best-effort if coords provided)
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        const { data: nearDonors } = await admin.rpc('nearby_donors', { lat: latitude, long: longitude, req_blood_type: 'O+', max_distance_meters: 15000 })
        const donorIds = (nearDonors || []).map((d: any) => d.id)
        if (donorIds.length) {
          const { data: donors } = await admin.from('users').select('email, expo_push_token').in('id', donorIds as any)
          const dEmails = (donors || []).map(d => d.email).filter(Boolean) as string[]
          const dPush = (donors || []).map(d => d.expo_push_token).filter(Boolean) as string[]
          if (dEmails.length) await sendNotificationEmail(dEmails, subj, html)
          if (dPush.length) await sendExpoPush(dPush.map(to => ({ to, title: 'Nearby blood camp', body: `${name} at ${address} • ${timeStr}`, data: { campId: data.id } })))
        }
      }
    } catch (e) {
      console.warn('camp notify failed', e)
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 })
  }
}
