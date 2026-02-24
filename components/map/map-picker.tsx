"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'

const MapPickerInner = dynamic(() => import('./map-picker-inner').then(m => m.MapPickerInner), { ssr: false, loading: () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
  </div>
) })
// Removed dynamic import of useMapEvents

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (lat: number, lng: number) => void
  initial?: { lat: number; lng: number }
  zIndex?: number
}

// Default to Panaji (Panjim), Goa, India
const DEFAULT_CENTER: [number, number] = [15.4909, 73.8278]

export function MapPicker({ open, onClose, onSelect, initial, zIndex = 4000 }: Props) {
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null)
  const [pos, setPos] = useState<[number, number]>(initial ? [initial.lat, initial.lng] : DEFAULT_CENTER)

  useEffect(() => {
    import('leaflet').then(L => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      })
      setLeaflet(L)
    })
  }, [])

  useEffect(() => {
    if (initial) setPos([initial.lat, initial.lng])
  }, [initial?.lat, initial?.lng])

  if (!open) return null

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* panel */}
      <div className="absolute inset-4 md:inset-10 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        {/* header */}
  <div className="absolute left-0 right-0 top-0 z-[1200] m-4 flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 shadow ring-1 ring-slate-200 backdrop-blur">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Select your landmark</h3>
            <p className="text-xs text-slate-600">Click on the map to place the pin. Drag to adjust. When satisfied, click Use location.</p>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/5 text-slate-700 hover:bg-slate-900/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* footer */}
  <div className="absolute bottom-0 left-0 right-0 z-[1200] m-4 flex items-center justify-between gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow ring-1 ring-slate-200 backdrop-blur">
          <div className="text-xs text-slate-700">
            <span className="font-medium">Lat:</span> {pos[0].toFixed(6)}
            <span className="mx-2">·</span>
            <span className="font-medium">Lng:</span> {pos[1].toFixed(6)}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => onSelect(pos[0], pos[1])}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >Use location</button>
          </div>
        </div>

        {/* map */}
        <div className="absolute inset-0">
          {leaflet && (
            <MapPickerInner pos={pos} onPosChange={(lat, lng) => setPos([lat, lng])} />
          )}
        </div>
      </div>
    </div>
  )
}

