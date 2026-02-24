import Link from 'next/link'
//
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils/date'
import { AlertTriangle } from 'lucide-react'
import { BloodFilter } from './blood-filter.client'
import { RespondButton } from './respond-button.client'
import { ApproveButton } from './approve-button.client'
import { CancelButton } from './cancel-button.client'
import { BloodMap } from '@/components/map/blood-map'
import { RecommendedDonors } from './recommended-donors.client'
import { DeliverButton } from './deliver-button.client'
import { RecommendedBanks } from './recommended-banks.client'

export const metadata = {
  title: 'BloodConnect | Emergency Requests'
}

type Search = { status?: string; blood?: string }

function urgencyVariant(urgency: 'critical' | 'urgent' | 'normal') {
  if (urgency === 'critical') return { label: 'Critical', variant: 'danger' as const }
  if (urgency === 'urgent') return { label: 'Urgent', variant: 'warning' as const }
  return { label: 'Normal', variant: 'outline' as const }
}

import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
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

export default async function RequestsPage({ searchParams }: { searchParams: Search }) {
  // Default to only active requests so completed ones don’t clutter the list
  const status = (searchParams.status || 'pending').toLowerCase()
  const blood = (searchParams.blood || '').toUpperCase()

  // Fetch real requests
  const admin = supabaseAdmin()
  const { data: rows, error } = await admin
    .from('emergency_requests')
    .select('id, blood_type, units_needed, units_fulfilled, urgency, status, created_at, hospital_id, approved_by, approved_at, hospital_acknowledged_at')
    .order('created_at', { ascending: false })
  if (error) throw error

  // Fetch hospital locations for distance calc
  const hospitalIds = Array.from(new Set((rows || []).map(r => r.hospital_id as string)))
  const { data: hospitals } = await admin
    .from('users')
    .select('id, name, latitude, longitude')
    .in('id', hospitalIds)

  // Current user location
  let viewer: { id: string; role: string; latitude?: number; longitude?: number } | undefined
  try {
    const session = await getCurrentUserFromCookie()
    if (session?.sub) {
      const { data } = await admin.from('users').select('id, role, latitude, longitude').eq('id', session.sub).maybeSingle()
      if (data) viewer = data as any
    }
  } catch {}

  let items = (rows || []).map(r => ({
    id: r.id as string,
    hospitalName: hospitals?.find(h => h.id === r.hospital_id)?.name || 'Hospital',
    bloodType: (r.blood_type as string) || '',
  unitsNeeded: r.units_needed as number,
  unitsFulfilled: (r.units_fulfilled as number) ?? 0,
    urgency: (r.urgency as 'critical'|'urgent'|'normal') || 'urgent',
    status: (r.status as string) || 'pending',
    createdAt: r.created_at as string,
    approvedBy: r.approved_by as string | null,
    approvedAt: r.approved_at as string | null,
    hospitalAckAt: r.hospital_acknowledged_at as string | null,
    distanceMeters: (() => {
      const hosp = hospitals?.find(h => h.id === r.hospital_id)
      if (!hosp || typeof hosp.latitude !== 'number' || typeof hosp.longitude !== 'number') return null
      if (!viewer || typeof viewer.latitude !== 'number' || typeof viewer.longitude !== 'number') return null
      return haversineDistanceMeters(
        { lat: hosp.latitude!, lng: hosp.longitude! },
        { lat: viewer.latitude!, lng: viewer.longitude! }
      )
    })() as number | null,
    hasResponses: false as boolean
  }))
  if (status !== 'all') items = items.filter(r => r.status === status)
  if (blood) items = items.filter(r => r.bloodType === blood)

  const filters: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'pending' },
    { label: 'Fulfilled', value: 'fulfilled' },
    { label: 'Cancelled', value: 'cancelled' }
  ]

  // blood types list handled inside client filter

  // Load current user role to gate request creation
  let role: string | undefined = viewer?.role

  // Load response counts to gate hospital approval display
  if (items.length) {
    const { data: counts } = await admin
      .from('request_fulfillments')
      .select('request_id')
      .in('request_id', items.map(i => i.id))
    const set = new Set((counts || []).map(c => c.request_id as string))
    items = items.map(i => ({ ...i, hasResponses: set.has(i.id) }))
  }

  // Load fulfillments for current hospital (to allow marking delivered) and for banks to see their submissions
  let fulfillmentsByRequest: Record<string, { id: string; units: number; delivered: boolean; mine: boolean }[]> = {}
  if (items.length) {
    const { data: fulf } = await admin
      .from('request_fulfillments')
      .select('id, request_id, units, delivered, blood_bank_id, hospital_id')
      .in('request_id', items.map(i => i.id))
      
    for (const f of (fulf || [])) {
      const key = (f as any).request_id as string
      if (!fulfillmentsByRequest[key]) fulfillmentsByRequest[key] = []
      const mine = viewer?.role === 'blood-bank' ? (f as any).blood_bank_id === viewer?.id : viewer?.role === 'hospital' ? (f as any).hospital_id === viewer?.id : false
      fulfillmentsByRequest[key].push({ id: (f as any).id, units: (f as any).units, delivered: !!(f as any).delivered, mine })
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Emergency Requests</h1>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Track live emergency blood requests and take action quickly.</p>
          {role === 'hospital' && (
            <Link href="/requests/new" className="rounded-xl bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
              New Request
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(f => (
            <Link
              key={f.value}
              href={`/requests?status=${f.value}${blood ? `&blood=${blood}` : ''}`}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition ${
                status === f.value
                  ? 'bg-white text-slate-900 border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/5 border-transparent'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div>
          <BloodFilter status={status} blood={blood} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map(request => {
          const urgency = urgencyVariant(request.urgency)
          return (
            <Card key={request.id} className="transition hover:shadow-md">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  {request.hospitalName}
                </CardTitle>
                <Badge variant={urgency.variant}>{urgency.label}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">
                    {request.bloodType}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{request.unitsNeeded} units</p>
                    <p className="text-xs text-slate-500">Requested {formatRelative(request.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    {(!request.distanceMeters && fulfillmentsByRequest[request.id]?.some(f => f.delivered)) ? null : (
                      <p className="text-sm text-slate-700">
                        {request.distanceMeters ? `${Math.round(request.distanceMeters / 1000)} km away` : 'Proximity pending'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                    <Link
                      href="#"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-black/5"
                    >
                      Details
                    </Link>
                    {role === 'hospital' && ['pending','fulfilled'].includes(request.status) && request.hasResponses && !request.approvedBy && (
                      fulfillmentsByRequest[request.id]?.some(f => f.delivered)
                        ? <ApproveButton requestId={request.id} />
                        : <span className="text-xs text-slate-500">Mark at least one delivery before approval</span>
                    )}
                    {role === 'blood-bank' && request.status === 'pending' && (
                      <RespondButton requestId={request.id} maxUnits={Math.max(0, request.unitsNeeded - (request.unitsFulfilled ?? 0))} />
                    )}
                    {role === 'hospital' && request.status === 'pending' && (
                      <CancelButton requestId={request.id} />
                    )}
                </div>
                {role === 'hospital' && request.status === 'pending' && (
                  <div className="space-y-3">
                    <RecommendedBanks
                      requestId={request.id}
                      remainingUnits={Math.max(0, (request.unitsNeeded - (request.unitsFulfilled ?? 0)))}
                      canUse={request.hasResponses || !!request.approvedBy}
                      showApprove={request.hasResponses}
                      canApprove={!!fulfillmentsByRequest[request.id]?.some(f => f.delivered)}
                      requestType={request.bloodType}
                    />
                  </div>
                )}
                {role === 'blood-bank' && request.status === 'pending' && (
                  <RecommendedDonors requestId={request.id} bloodType={request.bloodType} urgency={request.urgency} />
                )}

                {fulfillmentsByRequest[request.id]?.length ? (
                  <div className="rounded-lg border border-slate-200 p-2">
                    <p className="mb-1 text-xs font-medium text-slate-600">Responses</p>
                    <ul className="space-y-1">
                      {fulfillmentsByRequest[request.id].map(f => (
                        <li key={f.id} className="flex items-center justify-between text-sm">
                          <span>{f.units} units</span>
                          {f.delivered ? (
                            <span className="text-emerald-600">Delivered</span>
                          ) : viewer?.role === 'hospital' && f.mine ? (
                            <DeliverButton fulfillmentId={f.id} />
                          ) : viewer?.role === 'blood-bank' && f.mine ? (
                            <span className="text-slate-500">Awaiting hospital confirmation…</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
        {items.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-slate-600">
              No requests found. Try a different filter.
            </CardContent>
          </Card>
        )}
        <div className="lg:col-span-1 lg:row-span-full">
          <BloodMap />
        </div>
      </div>
    </div>
  )
}
