import { supabaseAdmin } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/stats-card'
import dynamic from 'next/dynamic'
const ForecastPanel = dynamic(() => import('@/components/dashboard/forecast-panel.client'), { ssr: false })
import ImpactWidget from '@/components/impact/impact-widget'

export default async function HospitalDashboard({ userId }: { userId: string }) {
  const admin = supabaseAdmin()

  const [{ data: fulfillments }, { data: recentRequests }] = await Promise.all([
    admin.from('request_fulfillments').select('units').eq('hospital_id', userId),
    admin.from('emergency_requests').select('status').eq('hospital_id', userId)
  ])

  const unitsFromBanks = (fulfillments || []).reduce((s, r) => s + (r.units || 0), 0)
  const lifesSaved = Math.round(unitsFromBanks * 3)
  const used = unitsFromBanks // simplification; a more precise metric would be tracked individually
  const active = (recentRequests || []).filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hospital Overview</h1>
        <p className="text-sm text-slate-500">Snapshot of blood usage and emergency flow.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Units Received" value={String(unitsFromBanks)} description="From partner blood banks" />
        <StatsCard title="Lives Saved" value={String(lifesSaved)} tone="success" description="Approximate impact" />
        <StatsCard title="Units Used" value={String(used)} description="Clinical consumption" />
        <StatsCard title="Active Requests" value={String(active)} tone="warning" description="Awaiting fulfillment" />
      </div>
      <ImpactWidget />
      <ForecastPanel />
    </div>
  )
}
