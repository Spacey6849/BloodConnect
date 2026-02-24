"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Use the existing inner picker to avoid duplication
const MapPickerInner = dynamic(() => import('@/components/map/map-picker-inner').then(m => m.MapPickerInner), { ssr: false })

export function LatLngPicker({
  initialLat,
  initialLng
}: {
  initialLat?: number
  initialLng?: number
}) {
  const [lat, setLat] = useState<number | undefined>(initialLat)
  const [lng, setLng] = useState<number | undefined>(initialLng)

  // Default to Goa if empty
  useEffect(() => {
    if (lat == null || lng == null) {
      setLat(15.4909)
      setLng(73.8278)
    }
  }, [])

  const hasPoint = typeof lat === 'number' && typeof lng === 'number'

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <div>
          <label className="text-sm">Latitude</label>
          <input
            name="latitude"
            type="number"
            step="any"
            value={hasPoint ? lat : ''}
            onChange={e => setLat(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">Longitude</label>
          <input
            name="longitude"
            type="number"
            step="any"
            value={hasPoint ? lng : ''}
            onChange={e => setLng(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>
      </div>
      <div className="h-64 rounded-xl border border-slate-200 lg:h-80 overflow-hidden">
        {hasPoint && (
          <MapPickerInner pos={[lat as number, lng as number]} onPosChange={(la, ln) => { setLat(la); setLng(ln) }} />
        )}
      </div>
    </div>
  )
}
