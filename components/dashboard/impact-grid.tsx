import { Card, CardContent } from '@/components/ui/card'
import { impactStats, mockCamps } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils/date'
import { Activity, Award, CalendarRange, Droplet, Users } from 'lucide-react'

const metrics = [
  {
    icon: Droplet,
    label: 'Total Units Donated',
    value: impactStats.unitsDonated.toLocaleString()
  },
  {
    icon: Users,
    label: 'Active Donors',
    value: impactStats.activeDonors.toLocaleString()
  },
  {
    icon: Activity,
    label: 'Lives Impacted',
    value: impactStats.totalLivesSaved.toLocaleString()
  },
  {
    icon: Award,
    label: 'Emergency Fulfillment',
    value: `${Math.round(impactStats.emergencyFulfillmentRate * 100)}%`
  }
]

export function ImpactGrid() {
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
            {mockCamps.map(camp => (
              <div key={camp.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{camp.name}</p>
                <p className="text-xs text-slate-500">{camp.address}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(camp.startDate)} • Organized by {camp.organizerName}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
