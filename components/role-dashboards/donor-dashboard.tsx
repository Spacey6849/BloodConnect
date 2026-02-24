import { supabaseAdmin } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Badge } from '@/components/ui/badge'
import ImpactWidget from '@/components/impact/impact-widget'

export default async function DonorDashboard({ userId }: { userId: string }) {
  const admin = supabaseAdmin()
  // Donor totals and verification status
  const [{ data: donor }, { data: donations }, { data: verRows }] = await Promise.all([
    admin.from('users').select('name, donation_count, blood_type').eq('id', userId).maybeSingle(),
    admin.from('donation_history').select('units_contributed').eq('donor_id', userId),
    admin.from('donor_verifications').select('verified').eq('donor_id', userId).eq('verified', true).limit(1)
  ])

  const totalUnits = (donations || []).reduce((s, r) => s + (r.units_contributed || 0), 0)
  const livesSaved = Math.round(totalUnits * 3) // rough heuristic
  const verified = (verRows || []).length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Donor Overview</h1>
        <p className="text-sm text-slate-500">Thanks for being a hero, {donor?.name || 'Donor'}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Lives Saved" value={String(livesSaved)} tone="success" description="Estimated from your donation units." />
        <StatsCard title="Total Units Donated" value={String(totalUnits)} description={`Blood Type: ${donor?.blood_type ?? '—'}`} />
        <StatsCard title="Verification" value={verified ? 'Verified' : 'Not verified'} tone={verified ? 'success' : 'warning'} description={verified ? 'You can donate immediately when eligible.' : 'Ask your bank to verify you.'} />
      </div>
      <ImpactWidget />
      <div className="rounded-2xl border p-4">
        <p className="text-sm text-slate-600">Status: {verified ? <Badge variant="success">Verified</Badge> : <Badge variant="outline">Pending Verification</Badge>}</p>
      </div>
    </div>
  )
}
