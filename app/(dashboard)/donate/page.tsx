import DonateClient from './donate.client'
import { supabaseAdmin, getCurrentUserFromCookie } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export const metadata = { title: 'BloodConnect | Donate' }

export default async function DonatePage() {
  const session = await getCurrentUserFromCookie()
  if (!session?.sub) return null

  const admin = supabaseAdmin()
  const { data: me } = await admin
    .from('users')
    .select('id, role, name, blood_type, eligible_date, is_available, latitude, longitude')
    .eq('id', session.sub)
    .maybeSingle()

  if (!me || me.role !== 'donor') return null

  // Load top donors leaderboard for right rail/section
  // Ensure absolute URL in server context to avoid "Failed to parse URL from /api/..."
  const h = headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
  const cookieHeader = h.get('cookie') || ''
  let lbJson: any = { donors: [] }
  try {
    const lbRes = await fetch(`${baseUrl}/api/leaderboard/donors?limit=5`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader }
    })
    lbJson = await lbRes.json().catch(() => ({ donors: [] }))
  } catch {
    lbJson = { donors: [] }
  }

  const now = new Date()
  const eligible = !me.eligible_date || new Date(me.eligible_date) <= now

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Donate Blood</h1>
        <p className="text-sm text-slate-600">Find a nearby blood bank and record your donation.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className={`rounded-xl border p-4 ${eligible ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
            <p className="text-sm">
              {eligible ? 'You are eligible to donate now.' : `You’ll be eligible again on ${new Date(me.eligible_date!).toLocaleDateString()}.`}
              {me.is_available === false ? ' You are currently marked unavailable.' : ''}
            </p>
          </div>
          <DonateClient
            donorId={me.id}
            bloodType={me.blood_type}
            origin={{ lat: me.latitude, lng: me.longitude }}
            eligible={eligible && me.is_available !== false}
          />
        </div>
        <aside className="space-y-3">
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Top Donors</h3>
            <ul className="space-y-1 text-sm">
              {(lbJson.donors || []).map((d: any, idx: number) => (
                <li key={d.donorId} className="flex items-center justify-between">
                  <span className="text-slate-700">{idx + 1}. {d.name || 'Donor'}</span>
                  <span className="text-slate-500">{(d.donationCount ?? 0)} donations</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
