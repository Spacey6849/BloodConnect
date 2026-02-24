"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
import { SingleMarkerMap } from '@/components/map/single-marker-map'

const MapPicker = dynamic(() => import('@/components/map/map-picker').then(m => m.MapPicker), { ssr: false })

export default function RegisterCamp() {
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [capacity, setCapacity] = useState<number | ''>('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  async function submit() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/camps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          address,
          start_date: start,
          end_date: end,
          capacity_target: capacity === '' ? null : capacity,
          latitude: lat,
          longitude: lng
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create camp')
      }
      setOpen(false)
      // refresh
      window.location.reload()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="rounded-xl">Register Bloodcamp</Button>
      {open && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Register Bloodcamp</p>
              <button onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-black/5">Close</button>
            </div>
            <div className="max-h-[80vh] space-y-3 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Capacity target</label>
                  <input type="number" value={capacity} onChange={e => setCapacity(e.target.value ? parseInt(e.target.value) : '')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-slate-700">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-slate-700">Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Start</label>
                  <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-slate-700">End</label>
                  <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-700">Select location on map</label>
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="hidden rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                  >Pick</button>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">Pick exact location on map</p>
                    <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>Choose on map</Button>
                  </div>
                  <div className="h-56 overflow-hidden rounded-xl border border-slate-200">
                    <SingleMarkerMap lat={lat ?? undefined} lng={lng ?? undefined} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Lat: {lat ?? '—'} • Lng: {lng ?? '—'}</p>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={loading || !name || !address || !start || !end}>{loading ? 'Saving…' : 'Create camp'}</Button>
            </div>
          </div>
        </div>
      )}
      {pickerOpen && (
        <MapPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(plat, plng) => { setLat(plat); setLng(plng); setPickerOpen(false) }}
          initial={lat && lng ? { lat, lng } : undefined}
          zIndex={5000}
        />
      )}
    </>
  )
}
