"use client"
import { useEffect, useMemo, useState } from 'react'

type Bank = {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  totalQuantity: number
  distanceMeters: number
  latitude?: number
  longitude?: number
}

export default function DonateClient({ donorId, bloodType, origin, eligible }: {
  donorId: string
  bloodType?: string | null
  origin?: { lat?: number | null; lng?: number | null } | null
  eligible: boolean
}) {
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(() => (
    origin && typeof origin.lat === 'number' && typeof origin.lng === 'number' ? { lat: origin.lat!, lng: origin.lng! } : null
  ))
  const [banks, setBanks] = useState<Bank[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [units, setUnits] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get browser location if not provided
  useEffect(() => {
    if (!geo && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
    }
  }, [geo])

  // Load nearby banks for this blood type
  useEffect(() => {
    async function load() {
      if (!geo || !bloodType) return
      const url = `/api/nearby/banks?lat=${geo.lat}&lng=${geo.lng}&bloodType=${encodeURIComponent(bloodType)}`
      const res = await fetch(url, { cache: 'no-store' })
      const j = await res.json().catch(() => ({ banks: [] }))
      setBanks(j.banks || [])
    }
    load()
  }, [geo, bloodType])

  const canSubmit = useMemo(() => !!eligible && !!selected && units > 0 && !!bloodType, [eligible, selected, units, bloodType])

  async function onDonate() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId: selected, units, bloodType })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to record donation')
      }
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Donation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {!bloodType && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Set your blood type in your profile to donate.
        </div>
      )}
      <div className="rounded-xl border">
        <div className="border-b p-3">
          <h3 className="text-sm font-semibold text-slate-800">Select a nearby blood bank</h3>
        </div>
        <div className="max-h-64 overflow-auto divide-y">
          {banks.map(b => (
            <label key={b.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex items-center gap-2">
                <input type="radio" name="bank" className="accent-emerald-600" checked={selected === b.id} onChange={() => setSelected(b.id)} />
                <div>
                  <div className="font-medium text-slate-800">{b.name}</div>
                  <div className="text-xs text-slate-500">{(b.distanceMeters/1000).toFixed(1)} km • Stock {b.totalQuantity}</div>
                </div>
              </div>
              {b.phone && <a className="text-xs text-primary-600 hover:underline" href={`tel:${b.phone}`}>Call</a>}
            </label>
          ))}
          {banks.length === 0 && (
            <div className="p-3 text-xs text-slate-500">{geo ? 'No nearby banks found.' : 'Detecting your location…'}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700">Units</label>
        <input
          type="number"
          min={1}
          max={10}
          value={units}
          onChange={(e)=> setUnits(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          className="w-24 rounded-md border px-2 py-1 text-sm"
        />
        <button
          onClick={onDonate}
          disabled={!canSubmit || submitting}
          className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >{submitting ? 'Saving…' : 'Record Donation'}</button>
      </div>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {!eligible && (
        <p className="text-xs text-slate-500">You’re not currently eligible. You can still browse banks, but recording a donation is disabled.</p>
      )}
    </div>
  )
}
