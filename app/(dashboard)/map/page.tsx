import { BloodMap } from '@/components/map/blood-map'

export const metadata = {
  title: 'BloodConnect | Map Overview'
}

export default function MapPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Geospatial Coverage</h1>
        <p className="text-sm text-slate-600">Monitor donors, blood banks, and active emergency requests in real time.</p>
      </header>
      <BloodMap />
    </div>
  )
}
