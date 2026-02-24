import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'
import { mailer } from '@/lib/mail/transport'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const donorId = params.id
    if (!donorId) return NextResponse.json({ error: 'Missing donor id' }, { status: 400 })

    const payload = await req.json().catch(() => ({} as any))
    const bloodType = typeof payload?.bloodType === 'string' ? payload.bloodType : undefined

    const admin = supabaseAdmin()

    // Only blood banks can notify donors from the map
    const { data: me, error: meErr } = await admin.from('users').select('id, role, name').eq('id', session.sub).maybeSingle()
    if (meErr) throw meErr
    if (!me || me.role !== 'blood-bank') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch donor contact
    const { data: donor, error: donorErr } = await admin
      .from('users')
      .select('id, email')
      .eq('id', donorId)
      .maybeSingle()
    if (donorErr) throw donorErr
    if (!donor?.email) return NextResponse.json({ error: 'Donor email not found' }, { status: 404 })

    // Create in-app notification
    const now = new Date().toISOString()
    await admin.from('notifications').insert({
      user_id: donorId,
      title: 'Nearby donation request',
      message: `${me.name || 'A blood bank'} is requesting a donation${bloodType ? ` (${bloodType})` : ''}. Please check the app for details.`,
      type: 'donor_request',
      data: { initiator_id: me.id, blood_type: bloodType },
      created_at: now
    })

    // Send email via nodemailer (if SMTP configured)
    const from = process.env.MAIL_FROM || 'BloodConnect <noreply@example.com>'
    const subject = 'Blood donation request near you'
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
        <h2>We need your help</h2>
        <p>${me.name || 'A blood bank'} is requesting a donation${bloodType ? ` for <strong>${bloodType}</strong>` : ''} in your area.</p>
        <p>Please open the BloodConnect app to view details and respond if you’re able to donate.</p>
        <p style="color:#64748b;font-size:12px">You’re receiving this because your donor profile is verified and available. If this is unexpected, you can update your availability in your profile.</p>
      </div>
    `
    try {
      await mailer.sendMail({ to: donor.email, from, subject, html })
    } catch (mailErr) {
      // Log but don’t fail the request if email transport is misconfigured
      console.warn('Email send failed for donor notify', mailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/donors/[id]/notify', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
