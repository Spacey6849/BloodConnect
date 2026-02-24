import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/utils/date'

export type DonorListItem = {
  id: string
  name: string
  bloodType: string | null
  lastDonation: string | null
  eligibleDate: string | null
  isAvailable: boolean | null
  address: string | null
  phone: string | null
  donationCount?: number | null
}

function availabilityBadge(profile: DonorListItem) {
  if (profile.isAvailable === false) return { label: 'Unavailable', variant: 'outline' as const }
  if (profile.eligibleDate && new Date(profile.eligibleDate) > new Date()) {
    return { label: 'Eligible soon', variant: 'warning' as const }
  }
  return { label: 'Ready to donate', variant: 'success' as const }
}

export function DonorAvailability({ donors = [] }: { donors?: DonorListItem[] }) {
  const list = donors ?? []
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">Verified Donor Network</CardTitle>
          <p className="text-sm text-slate-500">Donors verified by your blood bank</p>
        </div>
        <Button variant="ghost" size="sm">
          Manage Filters
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 && (
          <p className="text-sm text-slate-500">No verified donors yet.</p>
        )}
        {list.map(profile => {
          const badge = availabilityBadge(profile)
          return (
            <div key={profile.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">
                    {profile.bloodType}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
                    <p className="text-xs text-slate-500">Last donation {formatRelative(profile.lastDonation)}</p>
                  </div>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {profile.address && <span>{profile.address}</span>}
                {profile.donationCount != null && <span>Donations: {profile.donationCount}</span>}
                {profile.phone && <span>Contact: {profile.phone}</span>}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
