import { supabaseAdmin, getCurrentUserFromCookie } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'BloodConnect | History' }

export default async function HistoryPage() {
  const session = await getCurrentUserFromCookie()
  const admin = supabaseAdmin()
  if (!session?.sub) return null

  const { data: me } = await admin.from('users').select('id, role, name').eq('id', session.sub).maybeSingle()
  const role = me?.role

  let title = 'History'
  let rows: any[] = []
  // Map of userId -> name for counterpart display
  const nameById: Record<string, string> = {}

  if (role === 'donor') {
    title = 'Your Donation History'
    const { data } = await admin
      .from('donation_history')
      .select('id, blood_type, units_contributed, donation_date, blood_bank_id')
      .eq('donor_id', session.sub)
      .order('donation_date', { ascending: false })
    rows = data || []
    // Fetch bank names
    const bankIds = Array.from(new Set((rows || []).map(r => r.blood_bank_id).filter(Boolean)))
    if (bankIds.length) {
      const { data: banks } = await admin.from('users').select('id, name').in('id', bankIds)
      for (const b of (banks || [])) nameById[b.id as string] = (b.name as string) || 'Blood Bank'
    }
  } else if (role === 'hospital') {
    title = 'Hospital Fulfillment History'
    const { data } = await admin
      .from('request_fulfillments')
      .select('id, blood_type, units, created_at, blood_bank_id')
      .eq('hospital_id', session.sub)
      .order('created_at', { ascending: false })
    rows = data || []
    // Fetch bank names
    const bankIds = Array.from(new Set((rows || []).map((r: any) => r.blood_bank_id).filter(Boolean)))
    if (bankIds.length) {
      const { data: banks } = await admin.from('users').select('id, name').in('id', bankIds)
      for (const b of (banks || [])) nameById[b.id as string] = (b.name as string) || 'Blood Bank'
    }
  } else if (role === 'blood-bank') {
    title = 'Blood Bank Fulfillment History'
    const { data } = await admin
      .from('request_fulfillments')
      .select('id, blood_type, units, created_at, hospital_id')
      .eq('blood_bank_id', session.sub)
      .order('created_at', { ascending: false })
    rows = data || []
    // Fetch hospital names
    const hospIds = Array.from(new Set((rows || []).map((r: any) => r.hospital_id).filter(Boolean)))
    if (hospIds.length) {
      const { data: hosps } = await admin.from('users').select('id, name').in('id', hospIds)
      for (const h of (hosps || [])) nameById[h.id as string] = (h.name as string) || 'Hospital'
    }
  } else {
    title = 'History'
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {rows.map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between text-sm">
                <div className="text-slate-800">
                  {('units' in r) ? (
                    <span>
                      {r.units} units of {r.blood_type}
                      {role === 'hospital' && r.blood_bank_id ? (
                        <> from {nameById[r.blood_bank_id] || 'Blood Bank'}</>
                      ) : null}
                      {role === 'blood-bank' && r.hospital_id ? (
                        <> to {nameById[r.hospital_id] || 'Hospital'}</>
                      ) : null}
                    </span>
                  ) : (
                    <span>
                      {r.units_contributed} units of {r.blood_type}
                      {role === 'donor' && r.blood_bank_id ? (
                        <> to {nameById[r.blood_bank_id] || 'Blood Bank'}</>
                      ) : null}
                    </span>
                  )}
                </div>
                <div className="text-slate-500">
                  {('donation_date' in r) ? new Date(r.donation_date).toLocaleString() : new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="py-10 text-center text-slate-500">No history yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
