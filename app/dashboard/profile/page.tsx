"use client"

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Crosshair, Loader2 } from 'lucide-react'

const MapPicker = dynamic(() => import('@/components/map/map-picker').then(m => m.MapPicker), { ssr: false })
const SingleMarkerMap = dynamic(() => import('@/components/map/single-marker-map').then(m => m.SingleMarkerMap), { ssr: false })

type Me = {
  id: string
  role: 'donor'|'hospital'|'blood-bank'|'ngo'
  name?: string
  email?: string
  blood_type?: string | null
  phone?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        const { user } = await res.json()
        if (user) {
          setMe(user)
          setName(user.name || '')
          setPhone(user.phone || '')
          setAddress(user.address || '')
          setBloodType(user.blood_type || '')
          setLat(typeof user.latitude === 'number' ? user.latitude : null)
          setLng(typeof user.longitude === 'number' ? user.longitude : null)
          // fetch availability for donors
          if (user.role === 'donor') {
            // Use value from API if provided, else leave null so user can choose
            setIsAvailable(typeof (user as any).is_available === 'boolean' ? (user as any).is_available : null)
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load profile')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const canSetAvailability = me?.role === 'donor'

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude) },
      () => {}
    )
  }

  const onSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: any = {
        name, phone, address,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
      }
      if (canSetAvailability) {
        if (isAvailable !== null) body.is_available = isAvailable
        if (bloodType) body.blood_type = bloodType
      }
      const res = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save')
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading…</div>
  if (!me) return <div className="p-6 text-sm text-rose-600">Unable to load profile.</div>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Your Profile</h1>
        <p className="text-sm text-slate-600">Keep your contact info and location up to date to improve matches and routing.</p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <p className="text-sm font-medium text-slate-700">Account</p>
          <p className="text-xs text-slate-500">{me.email}</p>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Role</label>
            <input disabled value={me.role} className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Address</label>
            <input value={address} onChange={e=>setAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {canSetAvailability && (
            <div>
              <label className="text-sm font-medium text-slate-700">Blood type</label>
              <select value={bloodType} onChange={e=>setBloodType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          )}

          {/* Location controls */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Location</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={()=>setPickerOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                <MapPin className="h-4 w-4" /> Choose on map
              </button>
              <button type="button" onClick={useCurrentLocation} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                <Crosshair className="h-4 w-4" /> Use current location
              </button>
              {(lat != null && lng != null) && (
                <span className="text-xs text-slate-600">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              )}
              {(lat != null && lng != null) && (
                <button type="button" onClick={()=>{setLat(null); setLng(null)}} className="text-xs text-slate-500 underline">Clear</button>
              )}
            </div>
            {(lat != null && lng != null) && (
              <div className="mt-3 h-48 overflow-hidden rounded-xl ring-1 ring-slate-200">
                <SingleMarkerMap lat={lat} lng={lng} />
              </div>
            )}
          </div>

          {canSetAvailability && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Availability</label>
              <div className="mt-2 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <button type="button" onClick={()=>setIsAvailable(true)} className={`rounded-xl px-3 py-1.5 text-sm ${isAvailable === true ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}>Available</button>
                <button type="button" onClick={()=>setIsAvailable(false)} className={`rounded-xl px-3 py-1.5 text-sm ${isAvailable === false ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}>Not available</button>
                <span className="text-xs text-slate-500">Toggle to show if you’re currently ready to donate.</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {error && <span className="text-sm text-rose-600">{error}</span>}
          <button disabled={saving} onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      </div>

      <MapPicker
        open={pickerOpen}
        onClose={()=>setPickerOpen(false)}
        onSelect={(plat, plng)=>{ setLat(plat); setLng(plng); setPickerOpen(false) }}
        initial={lat!=null&&lng!=null ? { lat, lng } : undefined}
      />
    </div>
  )
}
