import { ImpactGrid } from '@/components/dashboard/impact-grid'
import { Card, CardContent } from '@/components/ui/card'
import { impactStats, mockDonationHistory } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils/date'
import { Award, Heart, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'BloodConnect | Impact Insights'
}

export default function ImpactPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Impact & Awareness</h1>
          <p className="text-sm text-slate-600">Celebrate community wins and keep our mission visible to stakeholders.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-xs font-medium text-primary-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            {impactStats.unitsDonated.toLocaleString()} units donated this year
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-xs font-medium text-success shadow-sm">
            <Heart className="h-4 w-4" />
            {impactStats.totalLivesSaved.toLocaleString()} lives positively touched
          </span>
        </div>
      </div>
      <ImpactGrid />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <Award className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Donor Leaderboard</p>
                <p className="text-xs text-slate-500">Recognising outstanding contributors</p>
              </div>
            </div>
            <div className="space-y-3">
              {mockDonationHistory.slice(0, 3).map(entry => (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{entry.bloodBankName}</p>
                  <p className="text-xs text-slate-500">Donation date: {formatDate(entry.donationDate)}</p>
                  <p className="text-xs text-slate-500">Units contributed: {entry.unitsContributed}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
              <p className="text-sm font-semibold text-danger">Did you know?</p>
              <p className="mt-1 text-sm text-slate-600">
                Every donation can save up to three lives. Encourage your network to join the registry and keep the momentum going.
              </p>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Healthy donors aged 18-60 can donate every 90 days.</li>
              <li>Hydrate well and eat iron-rich foods before your appointment.</li>
              <li>Mobilise pop-up donation units for low-density neighbourhoods.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
