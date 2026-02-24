import { DonorAvailability, type DonorListItem } from '@/components/dashboard/donor-availability'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelative } from '@/lib/utils/date'
import { Award } from 'lucide-react'
import LeaderboardClient from './Leaderboard.client'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'
import DonorListClient from './DonorList.client'
import VerifyInlineClient from './VerifyInline.client'
import SubmissionsReview from './SubmissionsReview.client'

export const metadata = {
  title: 'BloodConnect | Donor Network'
}

export default async function DonorsPage() {
  const session = await getCurrentUserFromCookie()
  const admin = supabaseAdmin()

  let donors: (DonorListItem & { verifiedByMe?: boolean })[] = []
  let donorLeaderboard: DonorListItem[] = []

  if (session?.role === 'blood-bank' && session.sub) {
    type Row = {
      donor_id: string
      users: {
        id: string
        name: string
        blood_type: string | null
        last_donation: string | null
        eligible_date: string | null
        is_available: boolean | null
        address: string | null
        phone: string | null
        donation_count: number | null
      } | null
    }
    const { data: rows } = await admin
      .from('donor_verifications')
      .select('donor_id, users:donor_id (id, name, blood_type, last_donation, eligible_date, is_available, address, phone, donation_count)')
      .eq('blood_bank_id', session.sub)
      .eq('verified', true)

    donors = (rows as Row[] | null | undefined)?.map(r => ({
      id: r.users?.id || r.donor_id,
      name: r.users?.name || 'Unknown',
      bloodType: r.users?.blood_type ?? null,
      lastDonation: r.users?.last_donation ?? null,
      eligibleDate: r.users?.eligible_date ?? null,
      isAvailable: r.users?.is_available ?? null,
      address: r.users?.address ?? null,
      phone: r.users?.phone ?? null,
      donationCount: r.users?.donation_count ?? null,
      verifiedByMe: true
    })) || []

    donorLeaderboard = [...donors]
      .sort((a, b) => (b.donationCount ?? 0) - (a.donationCount ?? 0))
      .slice(0, 3)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Donor Network</h1>
        <p className="text-sm text-slate-600">Activate verified donors, track eligibility windows, and celebrate milestones.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="h-full">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Verified Donor Network</CardTitle>
              <p className="text-sm text-slate-500">Donors verified by your blood bank</p>
            </div>
            {session?.role === 'blood-bank' && <VerifyInlineClient />}
          </CardHeader>
          <CardContent>
            <DonorListClient donors={donors} isBank={session?.role === 'blood-bank'} bankId={session?.sub || undefined} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Top Contributors</CardTitle>
              <p className="text-xs text-slate-500">Recognising consistent heroes in the network</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <LeaderboardClient />
            {session?.role === 'blood-bank' && session.sub && (
              <div className="mt-6">
                <SubmissionsReview bankId={session.sub} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
