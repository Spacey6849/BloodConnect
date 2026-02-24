import { supabaseAdmin } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/stats-card'
import ImpactWidget from '@/components/impact/impact-widget'

export default async function NgODashboard({ userId }: { userId: string }) {
  const admin = supabaseAdmin()

  // Load camps organized by this NGO
  const { data: camps } = await admin.from('blood_camps').select('id').eq('organizer_id', userId)
  const campIds = (camps || []).map(c => c.id)
  const campsHosted = campIds.length

  // Count registrations across those camps
  let registrations = 0
  let registeredUserIds: string[] = []
  if (campIds.length) {
    const { data: regs } = await admin
      .from('blood_camp_registrations')
      .select('id, user_id')
      .in('camp_id', campIds as any)
    registrations = (regs || []).length
    registeredUserIds = (regs || []).map(r => r.user_id).filter(Boolean)
  }

  // Approximate donations attributed to these camps: donations from registered donors
  let verifiedDonations = 0
  if (registeredUserIds.length) {
    const { data: dons } = await admin
      .from('donation_history')
      .select('units_contributed, donor_id')
      .in('donor_id', registeredUserIds as any)
    verifiedDonations = (dons || []).reduce((s, r: any) => s + (r.units_contributed || 0), 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">NGO Overview</h1>
        <p className="text-sm text-slate-500">Engagement and impact from your blood camps.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Camps Hosted" value={String(campsHosted)} description="Blood donation events" />
        <StatsCard title="Registrations" value={String(registrations)} description="People signed up" />
        <StatsCard title="Verified Donations" value={String(verifiedDonations)} tone="success" description="From registered donors" />
      </div>
      <ImpactWidget />
    </div>
  )
}
