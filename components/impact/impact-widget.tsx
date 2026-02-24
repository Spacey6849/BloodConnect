import { Card, CardContent } from '@/components/ui/card'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Activity, Award, CalendarRange, Droplet, Users } from 'lucide-react'

export default async function ImpactWidget() {
  const admin = supabaseAdmin()

  // Fetch metrics in parallel
  const [donationsRes, donorsHead, requestsRes, campsRes] = await Promise.all([
    admin.from('donation_history').select('units_contributed'),
    admin.from('donor_verifications').select('*', { count: 'exact', head: true }).eq('verified', true),
    admin.from('emergency_requests').select('status'),
    admin
      .from('blood_camps')
      .select('id,name,address,start_date')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(3)
  ])

  const totalUnits = (donationsRes.data || []).reduce((s: number, r: any) => s + (r.units_contributed || 0), 0)
  const activeDonors = donorsHead.count ?? 0
  const livesImpacted = Math.round(totalUnits * 3)

  const reqs = (requestsRes.data || []) as Array<{ status?: string }>
  const totalRelevant = reqs.filter(r => r.status !== 'canceled').length
  const fulfilledLike = reqs.filter(r => ['fulfilled', 'delivered', 'approved'].includes((r.status || '').toLowerCase())).length
  const emergencyFulfillmentRate = totalRelevant > 0 ? Math.round((fulfilledLike / totalRelevant) * 100) : 0

  const camps = (campsRes.data || []) as Array<{ id: string; name: string; address?: string; start_date?: string }>

  const metrics = [
    { icon: Droplet, label: 'Total Units Donated', value: totalUnits.toLocaleString() },
    { icon: Users, label: 'Active Donors', value: activeDonors.toLocaleString() },
    { icon: Activity, label: 'Lives Impacted', value: livesImpacted.toLocaleString() },
    { icon: Award, label: 'Emergency Fulfillment', value: `${emergencyFulfillmentRate}%` }
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-primary-200 hover:bg-primary-50/40"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
                    <p className="text-xl font-semibold text-slate-900">{metric.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Upcoming Donation Drives</p>
              <p className="text-xs text-slate-500">Coordinated with civic partners</p>
            </div>
          </div>
          <div className="space-y-3">
            {camps.length === 0 && (
              <p className="text-sm text-slate-500">No upcoming camps scheduled.</p>
            )}
            {camps.map(camp => (
              <div key={camp.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{camp.name}</p>
                {camp.address ? <p className="text-xs text-slate-500">{camp.address}</p> : null}
                {camp.start_date ? (
                  <p className="text-xs text-slate-500">{new Date(camp.start_date).toLocaleString()}</p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
