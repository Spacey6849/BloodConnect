"use client"

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
// Removed mockProfiles/mockRequests; only camps fallback remains if DB fails
import { mockCamps } from '@/lib/mock-data'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { BloodCamp } from '@/lib/types'
import type { EmergencyRequest } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Hospital,
  Users
} from 'lucide-react'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false })
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false })

type LayerKey = 'donors' | 'facilities' | 'requests' | 'events'

// Default center: Panaji (Panjim), Goa, India
const DEFAULT_CENTER: [number, number] = [15.4909, 73.8278]

const layerButtonStyles: Record<LayerKey, { label: string; icon: ReactNode; color: string }> = {
  donors: {
    label: 'Available Donors',
    icon: <Users className="h-4 w-4" />,
    color: 'linear-gradient(135deg,#22c55e,#15803d)'
  },
  facilities: {
    label: 'Hospitals & Banks',
    icon: <Hospital className="h-4 w-4" />,
    color: 'linear-gradient(135deg,#0ea5e9,#0369a1)'
  },
  requests: {
    label: 'Emergency Calls',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'linear-gradient(135deg,#f97316,#dc2626)'
  },
  events: {
    label: 'Donation Drives',
    icon: <CalendarDays className="h-4 w-4" />,
    color: 'linear-gradient(135deg,#a855f7,#7e22ce)'
  }
}

const urgencyStyles: Record<EmergencyRequest['urgency'], string> = {
  critical: 'bg-rose-500/10 text-rose-500 ring-1 ring-inset ring-rose-500/30',
  urgent: 'bg-amber-400/10 text-amber-500 ring-1 ring-inset ring-amber-500/30',
  normal: 'bg-emerald-400/10 text-emerald-500 ring-1 ring-inset ring-emerald-500/20'
}

function createCircleIcon(leaflet: typeof import('leaflet'), options: { color: string; label?: string; size?: number }) {
  const size = options.size ?? 34
  const style = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:9999px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'color:#fff',
    'font-weight:600',
    'font-size:12px',
    'box-shadow:0 10px 18px rgba(15,23,42,0.25)',
    'border:2px solid rgba(255,255,255,0.35)',
    `background:${options.color}`
  ].join(';')

  return leaflet.divIcon({
    className: 'bloodconnect-marker',
    html: `<div style="${style}">${options.label ?? ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

function createPulseIcon(leaflet: typeof import('leaflet'), options: { color: string; size?: number }) {
  const size = options.size ?? 28
  const innerSize = Math.floor(size * 0.45)
  const style = `position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;`
  const ring = 'position:absolute;width:100%;height:100%;border-radius:9999px;'
  const pulse = [
    '@keyframes pulseWave {',
    '0% { transform: scale(0.8); opacity: 0.7; }',
    '70% { transform: scale(1.8); opacity: 0; }',
    '100% { transform: scale(1.8); opacity: 0; }',
    '}'
  ].join('')

  return leaflet.divIcon({
    className: 'bloodconnect-request-marker',
    html: `
      <style>${pulse}</style>
      <div style="${style}">
        <span style="${ring}background:${options.color};opacity:0.15;animation:pulseWave 2.6s infinite ease-out"></span>
        <span style="${ring}background:${options.color};opacity:0.35"></span>
        <span style="position:absolute;width:${innerSize}px;height:${innerSize}px;border-radius:9999px;background:${options.color}"></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(innerSize / 2)]
  })
}

export function BloodMap() {
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null)
  const [camps, setCamps] = useState<BloodCamp[]>([])
  const [me, setMe] = useState<{ id: string; role: string; latitude?: number; longitude?: number } | null>(null)
  const [mode, setMode] = useState<'hospital' | 'blood-bank' | 'donor' | 'ngo' | 'neutral'>('neutral')
  const [radiusKm, setRadiusKm] = useState<number>(10)
  const [bloodType, setBloodType] = useState<'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-'>('O+')
  const [nearbyDonors, setNearbyDonors] = useState<any[]>([])
  const [nearbyBanks, setNearbyBanks] = useState<any[]>([])
  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>({ donors: false, facilities: false, requests: false, events: false })

  useEffect(() => {
    import('leaflet').then(module => {
      const L = module
      // Ensure default marker icons render correctly when we fallback to the Leaflet assets
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      })
      setLeaflet(L)
    })
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(DEFAULT_CENTER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => setLocation([position.coords.latitude, position.coords.longitude]),
      () => setLocation(DEFAULT_CENTER),
      { enableHighAccuracy: true, timeout: 4000 }
    )
  }, [])

  // Load current user (role and stored location)
  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        const json = await res.json()
        if (json?.user) {
          setMe(json.user)
          if (!location && typeof json.user.latitude === 'number' && typeof json.user.longitude === 'number') {
            setLocation([json.user.latitude, json.user.longitude])
          }
          if (json.user.role === 'hospital') setMode('hospital')
          else if (json.user.role === 'blood-bank') setMode('blood-bank')
          else if (json.user.role === 'donor') setMode('donor')
          else if (json.user.role === 'ngo') setMode('ngo')
        }
      } catch {}
    }
    loadMe()
  }, [location])

  const [requests, setRequests] = useState<any[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [donors, setDonors] = useState<any[]>([])

  const activeRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests])

  const stats = {
    donorsAvailable: donors.filter(d => d.isAvailable !== false).length,
    donorsTotal: donors.length,
    facilities: centers.length,
    activeRequests: activeRequests.length,
    upcomingCamps: camps.length || mockCamps.length
  }

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const mapCenter = location ?? DEFAULT_CENTER

  // Auto-select layers by role
  useEffect(() => {
    if (!me) return
    if (me.role === 'hospital') {
      setActiveLayers({ donors: false, facilities: true, requests: false, events: true })
    } else if (me.role === 'donor') {
      setActiveLayers({ donors: false, facilities: true, requests: false, events: true })
    } else if (me.role === 'ngo') {
      setActiveLayers({ donors: false, facilities: true, requests: false, events: false })
    } else if (me.role === 'blood-bank') {
      setActiveLayers({ donors: true, facilities: true, requests: false, events: true })
    } else {
      setActiveLayers({ donors: true, facilities: true, requests: true, events: false })
    }
  }, [me])

  // Fetch geospatial results per role
  useEffect(() => {
    const run = async () => {
      const [lat, lng] = mapCenter
      const radiusMeters = Math.floor(radiusKm * 1000)
      if (mode === 'hospital' || mode === 'donor') {
        try {
          const url = new URL('/api/nearby/banks', window.location.origin)
          url.searchParams.set('lat', String(lat))
          url.searchParams.set('lng', String(lng))
          url.searchParams.set('bloodType', bloodType)
          url.searchParams.set('radiusMeters', String(radiusMeters))
          const res = await fetch(url.toString(), { cache: 'no-store' })
          const json = await res.json()
          setNearbyBanks(Array.isArray(json?.banks) ? json.banks : [])
        } catch { setNearbyBanks([]) }
      } else if (mode === 'blood-bank') {
        try {
          const url = new URL('/api/nearby/donors', window.location.origin)
          url.searchParams.set('lat', String(lat))
          url.searchParams.set('lng', String(lng))
          url.searchParams.set('bloodType', bloodType)
          url.searchParams.set('radiusMeters', String(radiusMeters))
          const res = await fetch(url.toString(), { cache: 'no-store' })
          const json = await res.json()
          setNearbyDonors(Array.isArray(json?.donors) ? json.donors : [])
        } catch { setNearbyDonors([]) }
      } else if (mode === 'ngo') {
        try {
          const url = new URL('/api/nearby/hospitals', window.location.origin)
          url.searchParams.set('lat', String(lat))
          url.searchParams.set('lng', String(lng))
          url.searchParams.set('radiusMeters', String(radiusMeters))
          const res = await fetch(url.toString(), { cache: 'no-store' })
          const json = await res.json()
          // Reuse centers to represent hospitals
          setCenters(Array.isArray(json?.hospitals) ? json.hospitals : [])
        } catch { setCenters([]) }
        try {
          const url = new URL('/api/nearby/banks', window.location.origin)
          url.searchParams.set('lat', String(lat))
          url.searchParams.set('lng', String(lng))
          url.searchParams.set('bloodType', bloodType)
          url.searchParams.set('radiusMeters', String(radiusMeters))
          const res = await fetch(url.toString(), { cache: 'no-store' })
          const json = await res.json()
          // Merge hospitals and banks visually under facilities
          setNearbyBanks(Array.isArray(json?.banks) ? json.banks : [])
        } catch { setNearbyBanks([]) }
      } else {
        setNearbyBanks([])
        setNearbyDonors([])
      }
      // Load all active emergency requests for the requests layer
      try {
        const res = await fetch('/api/requests?status=pending', { cache: 'no-store' })
        const json = await res.json()
        if (Array.isArray(json?.items)) setRequests(json.items)
      } catch { setRequests([]) }
      // Load facilities for neutral mode
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        const me = await res.json()
        // Fetch centers around current map center
        const url = new URL('/api/nearby/banks', window.location.origin)
        url.searchParams.set('lat', String(lat))
        url.searchParams.set('lng', String(lng))
        url.searchParams.set('bloodType', bloodType)
        url.searchParams.set('radiusMeters', String(radiusMeters))
        const near = await fetch(url.toString(), { cache: 'no-store' })
        const njson = await near.json()
        setCenters(Array.isArray(njson?.banks) ? njson.banks : [])
      } catch { setCenters([]) }
    }
    // only run in browser
    if (typeof window !== 'undefined' && mapCenter) run()
  }, [mode, bloodType, radiusKm, mapCenter])

  // Load blood camps from DB (public.blood_camps) for the events layer
  useEffect(() => {
    const load = async () => {
      try {
        const supa = supabaseBrowser()
        const { data } = await supa
          .from('blood_camps')
          .select('id,name,address,start_date,end_date,latitude,longitude')
          .order('start_date', { ascending: true })
        const rows: BloodCamp[] = (data || [])
          .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
          .map(r => ({
            id: r.id as string,
            name: r.name as string,
            description: undefined,
            address: (r.address as string) || '',
            coordinates: [r.latitude as number, r.longitude as number] as [number, number],
            startDate: r.start_date as string,
            endDate: r.end_date as string,
            organizerName: ''
          }))
        setCamps(rows)
      } catch {
        // ignore fetch errors; fall back to mock camps
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
              <Activity className="h-3.5 w-3.5" />
              Live network telemetry
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Live Coverage Map</p>
              <p className="text-sm text-slate-600">Toggle layers to spotlight donors, hospitals, emergency calls, and scheduled drives.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(activeLayers) as LayerKey[]).map(key => {
              const layer = layerButtonStyles[key]
              const isActive = activeLayers[key]
              return (
                <Button
                  key={key}
                  type="button"
                  variant={isActive ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => toggleLayer(key)}
                  className={isActive ? 'border-transparent text-white shadow-lg' : 'border-slate-200 text-slate-600'}
                  style={isActive ? { backgroundImage: layer.color } : undefined}
                >
                  <span className="flex items-center gap-2 text-sm">
                    {layer.icon}
                    {layer.label}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Donors Ready</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.donorsAvailable}/{stats.donorsTotal}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Hospitals & Banks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.facilities}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Active Emergencies</p>
            <p className="mt-2 text-2xl font-semibold text-rose-500">{stats.activeRequests}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Upcoming Drives</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.upcomingCamps}</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm shadow-slate-900/5">
          <div className="absolute right-4 top-4 z-[500] space-y-2">
            <div className="rounded-2xl bg-white/90 p-3 shadow">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Blood Type</label>
                  <select className="rounded border px-2 py-1 text-xs" value={bloodType} onChange={e => setBloodType(e.target.value as any)}>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Radius (km)</label>
                  <input className="w-20 rounded border px-2 py-1 text-xs" type="number" min={1} max={50} value={radiusKm} onChange={e => setRadiusKm(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute left-4 top-4 z-[500] space-y-2">
            <div className="rounded-2xl bg-white/90 p-3 shadow">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Legend</p>
              <div className="mt-2 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" /> Donor (ready)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-400" /> Donor (unavailable)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-sky-500" /> Hospital / Blood bank
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500" /> Emergency call
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-violet-500" /> Pop-up drive
                </div>
              </div>
            </div>
          </div>

          <MapContainer center={mapCenter} zoom={12} className="h-[560px] w-full" scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

            {leaflet && location && (
              <CircleMarker
                center={location}
                radius={10}
                pathOptions={{ color: '#0ea5e9', weight: 3, opacity: 0.6, fillColor: '#38bdf8', fillOpacity: 0.35 }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <span className="text-xs font-medium text-slate-800">Your current position</span>
                </Tooltip>
              </CircleMarker>
            )}

            {leaflet && location && (mode === 'hospital' || mode === 'blood-bank' || mode === 'donor') && (
              // Visualize search radius around user (meters)
              <Circle
                center={location}
                radius={radiusKm * 1000}
                pathOptions={{ color: mode === 'hospital' ? '#f97316' : '#10b981', weight: 2, opacity: 0.25, fillOpacity: 0.08 }}
              />
            )}

            {leaflet && activeLayers.facilities && (
              (mode === 'hospital' || mode === 'donor') && nearbyBanks.length
                ? nearbyBanks
                : centers
            ).map(profile => (
              <Marker
                key={profile.id}
                position={(profile.coordinates as any) ?? (profile.latitude && profile.longitude ? [profile.latitude, profile.longitude] : DEFAULT_CENTER)}
                icon={createCircleIcon(leaflet, {
                  color: 'linear-gradient(135deg,#38bdf8,#0284c7)',
                  label: ('totalQuantity' in profile) ? 'B' : 'H'
                })}
              >
                <Popup>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
                    {profile.address && <p className="text-xs text-slate-500">{profile.address}</p>}
                    {'totalQuantity' in profile && <p className="text-xs text-slate-500">Stock: {profile.totalQuantity} units ({bloodType})</p>}
                    {'distanceMeters' in profile && <p className="text-xs text-slate-400">{Math.round((profile.distanceMeters as number)/100)/10} km away</p>}
                    <Badge variant="outline">{(profile.role ?? 'blood-bank') === 'blood-bank' ? 'Blood Bank' : 'Hospital'}</Badge>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <span className="text-xs font-medium text-slate-800">{profile.name}</span>
                </Tooltip>
              </Marker>
            ))}

            {leaflet && activeLayers.donors && (mode === 'blood-bank' && nearbyDonors.length ? nearbyDonors : donors).map((profile: any) => (
              <Marker
                key={profile.id}
                position={(profile.coordinates as any) ?? (profile.latitude && profile.longitude ? [profile.latitude, profile.longitude] : DEFAULT_CENTER)}
                icon={createCircleIcon(leaflet, {
                  color: profile.isAvailable ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#94a3b8,#475569)',
                  label: profile.bloodType
                })}
              >
                <Popup>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Verified donor</p>
                    {'address' in profile && profile.address && <p className="text-xs text-slate-500">{profile.address}</p>}
                    <div className="flex gap-2">
                      <Badge variant="outline">{profile.bloodType}</Badge>
                      <Badge variant={profile.isAvailable ? 'success' : 'outline'}>{profile.isAvailable ? 'Ready' : 'Resting'}</Badge>
                    </div>
                    {'verifiedByPrimary' in profile && profile.verifiedByPrimary && (
                      <p className="text-[0.7rem] text-emerald-700">Verified by: <span className="font-medium">{profile.verifiedByPrimary}</span></p>
                    )}
                    {'distanceMeters' in profile && <p className="text-[0.7rem] text-slate-400">{Math.round((profile.distanceMeters as number)/100)/10} km away</p>}
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/donors/${profile.id}/notify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bloodType })
                          })
                          if (!res.ok) {
                            const b = await res.json().catch(() => ({}))
                            throw new Error(b?.error || 'Failed to notify')
                          }
                          alert('Donor has been notified')
                        } catch (e) {
                          console.error(e)
                          alert('Unable to notify donor')
                        }
                      }}
                    >
                      Notify
                    </button>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -12]} opacity={0.9}>
                  <span className="text-xs font-medium text-slate-800">Donor</span>
                </Tooltip>
              </Marker>
            ))}

            {leaflet && activeLayers.requests && activeRequests.map(request => (
              <Marker
                key={request.id}
                position={request.coordinates || (typeof request.latitude === 'number' && typeof request.longitude === 'number' ? [request.latitude, request.longitude] : DEFAULT_CENTER)}
                icon={createPulseIcon(leaflet, { color: request.urgency === 'critical' ? '#ef4444' : request.urgency === 'urgent' ? '#f97316' : '#22c55e' })}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={urgencyStyles[(request.urgency as 'critical'|'urgent'|'normal') || 'urgent']}>Urgency: {request.urgency}</Badge>
                      <Badge variant="outline">{request.units_needed ?? request.unitsNeeded} units</Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{request.hospital_name ?? request.hospitalName ?? 'Hospital'}</p>
                    {request.address && <p className="text-xs text-slate-500">{request.address}</p>}
                    <p className="text-xs text-slate-500">Needs {request.blood_type ?? request.bloodType}</p>
                    {request.distanceMeters && <p className="text-[0.7rem] text-slate-400">{Math.round((request.distanceMeters as number)/100)/10} km from you</p>}
                    {request.created_at && <p className="text-[0.7rem] text-slate-400">Logged {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {leaflet && activeLayers.requests && activeRequests.map(request => (
              // Visual 10 km notification radius around hospital for each active request
              <Circle
                key={`${request.id}-radius`}
                center={request.coordinates || (typeof request.latitude === 'number' && typeof request.longitude === 'number' ? [request.latitude, request.longitude] : DEFAULT_CENTER)}
                radius={10000}
                pathOptions={{ color: '#f97316', weight: 1.5, opacity: 0.18, fillOpacity: 0.05 }}
              />
            ))}

            {leaflet && activeLayers.events && ((camps.length ? camps : mockCamps).filter(c => {
              const end = new Date(c.endDate).getTime()
              return isFinite(end) ? end >= Date.now() : true
            })).map(camp => (
              <Marker
                key={camp.id}
                position={camp.coordinates}
                icon={createCircleIcon(leaflet, { color: 'linear-gradient(135deg,#a855f7,#7c3aed)', label: 'D' })}
              >
                <Popup>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{camp.name}</p>
                    {camp.address && <p className="text-xs text-slate-500">{camp.address}</p>}
                    <p className="text-xs text-slate-500">Starts {formatDistanceToNow(new Date(camp.startDate), { addSuffix: true })}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
      </div>
    </div>
  )
}
