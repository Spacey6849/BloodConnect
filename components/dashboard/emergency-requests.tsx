"use client"
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelative } from '@/lib/utils/date'
import { AlertTriangle } from 'lucide-react'
import { RespondButton } from '@/app/(dashboard)/requests/respond-button.client'

function urgencyVariant(urgency: 'critical' | 'urgent' | 'normal') {
  if (urgency === 'critical') return { label: 'Critical', variant: 'danger' as const }
  if (urgency === 'urgent') return { label: 'Urgent', variant: 'warning' as const }
  return { label: 'Normal', variant: 'outline' as const }
}

export function EmergencyRequests() {
  const [items, setItems] = useState<any[]>([])
  const [viewer, setViewer] = useState<{ latitude?: number; longitude?: number } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
        const meJson = await meRes.json().catch(() => ({}))
        setViewer(meJson?.user || null)
      } catch {}
      try {
        const res = await fetch('/api/requests?status=pending&limit=10', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (Array.isArray(json?.items)) setItems(json.items)
      } catch {}
    }
    load()
  }, [])

  const list = useMemo(() => items, [items])

  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-danger" />
          Active Emergency Requests
        </CardTitle>
        <a href="/requests" className="text-xs font-medium text-primary-600">View all</a>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.map((request: any) => {
          const urgency = urgencyVariant((request.urgency as 'critical'|'urgent'|'normal') || 'urgent')
          return (
            <div
              key={request.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{request.hospitalName}</p>
                  <p className="text-xs text-slate-500">Requested {formatRelative(request.createdAt)}</p>
                </div>
                <Badge variant={urgency.variant}>{urgency.label}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">
                    {request.bloodType || request.blood_type}
                  </span>
                  <div>
                    <p className="text-sm text-slate-700">{request.unitsNeeded ?? request.units_needed} units required</p>
                    {typeof viewer?.latitude === 'number' && typeof viewer?.longitude === 'number' && typeof request.latitude === 'number' && typeof request.longitude === 'number' ? (
                      <p className="text-xs text-slate-500">{Math.round(distanceKm({ lat: viewer!.latitude!, lng: viewer!.longitude! }, { lat: request.latitude, lng: request.longitude }))} km away</p>
                    ) : (
                      <p className="text-xs text-slate-500">Proximity pending</p>
                    )}
                  </div>
                </div>
                <RespondButton requestId={request.id} maxUnits={Math.max(0, (request.unitsNeeded ?? request.units_needed ?? 0) - (request.unitsFulfilled ?? request.units_fulfilled ?? 0))} />
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <p className="text-sm text-slate-500">No active emergency requests nearby right now.</p>
        )}
      </CardContent>
    </Card>
  )
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371 // km
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDlat = Math.sin(dLat / 2)
  const sinDlng = Math.sin(dLng / 2)
  const c = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
  return R * d
}
