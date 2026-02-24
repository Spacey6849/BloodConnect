import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'
import { sendNotificationEmail } from '@/lib/mail/notify'
import { sendExpoPush } from '@/lib/push/expo'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const status = (url.searchParams.get('status') || 'pending').toLowerCase()
    const blood = url.searchParams.get('blood')?.toUpperCase() || undefined
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 200)

    const admin = supabaseAdmin()
    let q = admin
      .from('emergency_requests')
      .select('id, hospital_id, blood_type, units_needed, units_fulfilled, urgency, status, created_at, address')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') q = q.eq('status', status)
    if (blood) q = q.eq('blood_type', blood)
    q = q.limit(limit)

    const { data: rows, error } = await q
    if (error) throw error

    const hospitalIds = Array.from(new Set((rows || []).map(r => r.hospital_id as string)))
    const { data: hospitals, error: hospErr } = await admin
      .from('users')
      .select('id, name, latitude, longitude')
      .in('id', hospitalIds)
    if (hospErr) throw hospErr

    const items = (rows || []).map(r => {
      const hosp = hospitals?.find(h => h.id === r.hospital_id)
      return {
        id: r.id as string,
        hospitalId: r.hospital_id as string,
        hospitalName: hosp?.name || 'Hospital',
        bloodType: r.blood_type as string,
        unitsNeeded: r.units_needed as number,
        unitsFulfilled: (r.units_fulfilled as number) ?? 0,
        urgency: r.urgency as string,
        status: r.status as string,
        createdAt: r.created_at as string,
        address: r.address as string | null,
        latitude: typeof hosp?.latitude === 'number' ? hosp!.latitude : null,
        longitude: typeof hosp?.longitude === 'number' ? hosp!.longitude : null
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error('GET /api/requests error', e)
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: me, error: meErr } = await admin.from('users').select('id, role, location').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (me.role !== 'hospital') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({} as any))
    const { blood_type, units_needed, urgency, latitude, longitude, address } = body || {}

    if (!blood_type || !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(blood_type)) {
      return NextResponse.json({ error: 'Invalid blood_type' }, { status: 400 })
    }
    const unitsNum = Number(units_needed)
    if (!Number.isFinite(unitsNum) || unitsNum <= 0) {
      return NextResponse.json({ error: 'Invalid units_needed' }, { status: 400 })
    }
    const u = String(urgency || 'urgent')
    if (!['critical','urgent','normal'].includes(u)) {
      return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 })
    }

    // Compute geography from provided lat/lng if present, else reuse hospital location
    let location
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      location = `SRID=4326;POINT(${longitude} ${latitude})`
    }

    const insert: any = {
      hospital_id: me.id,
      blood_type,
      units_needed: unitsNum,
      urgency: u,
      status: 'pending'
    }
    if (address) insert.address = address
    // Supabase can accept WKT via PostgREST when using the geography column if cast from text; use RPC wrapper if needed
    if (location) insert.location = location as any

    const { data, error } = await admin.from('emergency_requests').insert(insert).select('id').single()
    if (error) throw error

    // Notify nearby blood banks and NGOs via email + push
    try {
      // Resolve hospital coords; fall back to hospital profile location if request didn’t include
      let lat = typeof latitude === 'number' ? latitude : undefined
      let lng = typeof longitude === 'number' ? longitude : undefined
      if (lat == null || lng == null) {
        if ((me as any).location && typeof (me as any).location?.coordinates?.[0] === 'number') {
          lng = (me as any).location.coordinates[0]
          lat = (me as any).location.coordinates[1]
        } else {
          // fetch fresh user row for coords
          const { data: meFull } = await admin.from('users').select('latitude, longitude').eq('id', me.id).maybeSingle()
          if (typeof meFull?.latitude === 'number' && typeof meFull?.longitude === 'number') {
            lat = meFull.latitude; lng = meFull.longitude
          }
        }
      }
      // Nearby banks by distance to hospital
      let bankEmails: string[] = []
      let bankPushes: string[] = []
      if (typeof lat === 'number' && typeof lng === 'number') {
        const { data: banks } = await admin.rpc('nearby_blood_banks', { lat, long: lng, req_blood_type: blood_type, max_distance_meters: 15000 })
        const bankIds = (banks || []).map((b: any) => b.id)
        if (bankIds.length) {
          const { data: bankUsers } = await admin
            .from('users')
            .select('email, expo_push_token')
            .in('id', bankIds as any)
          for (const u of bankUsers || []) {
            if (u.email) bankEmails.push(u.email)
            if (u.expo_push_token) bankPushes.push(u.expo_push_token)
          }
        }
      }
      // NGOs broadcast (simple: all NGOs for now)
      const { data: ngos } = await admin.from('users').select('email, expo_push_token').eq('role','ngo')
      const ngoEmails = (ngos || []).map(n => n.email).filter(Boolean) as string[]
      const ngoPushes = (ngos || []).map(n => n.expo_push_token).filter(Boolean) as string[]

      const subj = `Emergency request: ${blood_type} • ${unitsNum} units (${u})`
      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
          <h2>Emergency Request</h2>
          <p><strong>Blood Type:</strong> ${blood_type}</p>
          <p><strong>Units Needed:</strong> ${unitsNum}</p>
          <p><strong>Urgency:</strong> ${u}</p>
          ${address ? `<p><strong>Location:</strong> ${address}</p>` : ''}
          <p>Request ID: ${data.id}</p>
        </div>
      `
      if (bankEmails.length) await sendNotificationEmail(bankEmails, subj, html)
      if (ngoEmails.length) await sendNotificationEmail(ngoEmails, subj, html)

      const pushMsgs = [...bankPushes, ...ngoPushes].map(to => ({
        to,
        title: 'Emergency blood request',
        body: `${unitsNum} units of ${blood_type} (${u})` + (address ? ` at ${address}` : ''),
        data: { requestId: data.id, bloodType: blood_type, units: unitsNum, urgency: u }
      }))
      if (pushMsgs.length) await sendExpoPush(pushMsgs)
    } catch (e) {
      console.warn('request notify failed', e)
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (e: any) {
    console.error('POST /api/requests error', e)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}
