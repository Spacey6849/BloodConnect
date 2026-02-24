import { supabaseAdmin, getCurrentUserFromCookie } from '@/lib/supabase/server'

export const metadata = { title: 'BloodConnect | Alerts' }

async function respond(alertId: string, action: 'accept'|'decline') {
  'use server'
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/alerts/${alertId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  })
}

export default async function AlertsPage() {
  const session = await getCurrentUserFromCookie()
  if (!session?.sub) return null
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('donor_alerts')
    .select('id, request_id, status, notified_at, response_at')
    .eq('donor_id', session.sub)
    .order('notified_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Alerts</h1>
      <div className="divide-y divide-slate-200 rounded-md border">
        {(data || []).map(a => (
          <div key={a.id} className="flex items-center justify-between p-3">
            <div className="text-sm">
              <div className="font-medium text-slate-800">Request {a.request_id.slice(0,8)}…</div>
              <div className="text-xs text-slate-500">{a.status}</div>
            </div>
            <div className="flex gap-2">
              {a.status === 'pending' && (
                <>
                  <form action={async () => respond(a.id, 'accept')}><button className="rounded bg-emerald-600 px-3 py-1 text-xs text-white">Accept</button></form>
                  <form action={async () => respond(a.id, 'decline')}><button className="rounded bg-slate-200 px-3 py-1 text-xs text-slate-800">Decline</button></form>
                </>
              )}
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="p-6 text-sm text-slate-500">No alerts.</div>
        )}
      </div>
    </div>
  )
}
