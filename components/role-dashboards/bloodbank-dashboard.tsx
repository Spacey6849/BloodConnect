import { supabaseAdmin } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/stats-card'
import dynamic from 'next/dynamic'
const ForecastPanel = dynamic(() => import('@/components/dashboard/forecast-panel.client'), { ssr: false })
import ImpactWidget from '@/components/impact/impact-widget'

export default async function BloodBankDashboard({ userId }: { userId: string }) {
  const admin = supabaseAdmin()

  const [inventoryRes, fulfillmentsRes, donorsFromRes, verifiedDonorsRes] = await Promise.all([
    admin.from('blood_inventory').select('quantity').eq('blood_bank_id', userId),
    admin.from('request_fulfillments').select('units').eq('blood_bank_id', userId),
    admin.from('donation_history').select('units_contributed').eq('blood_bank_id', userId),
    admin.from('donor_verifications').select('donor_id').eq('blood_bank_id', userId).eq('verified', true)
  ])

  const totalInventory = (inventoryRes.data || []).reduce((s, r:any) => s + (r.quantity || 0), 0)
  const donatedToHospitals = (fulfillmentsRes.data || []).reduce((s, r:any) => s + (r.units || 0), 0)
  const receivedFromDonors = (donorsFromRes.data || []).reduce((s, r:any) => s + (r.units_contributed || 0), 0)
  const verifiedDonors = (verifiedDonorsRes.data || []).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Blood Bank Overview</h1>
        <p className="text-sm text-slate-500">Inventory, flows and verification at a glance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Inventory" value={String(totalInventory)} description="All blood types (units)" />
        <StatsCard title="To Hospitals" value={String(donatedToHospitals)} description="Units fulfilled" />
        <StatsCard title="From Donors" value={String(receivedFromDonors)} description="Units collected" />
        <StatsCard title="Verified Donors" value={String(verifiedDonors)} description="Managed by your bank" />
      </div>
      <ImpactWidget />
      <ForecastPanel />
    </div>
  )
}
