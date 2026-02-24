"use client"

import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'

// Fix default marker icons in bundlers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

function Recenter({ center }: { center: LatLngTuple }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}

export function SingleMarkerMap({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const center: LatLngTuple = useMemo(() => {
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng]
    return [15.4909, 73.8278] // Goa default
  }, [lat, lng])

  const hasPoint = typeof lat === 'number' && typeof lng === 'number'

  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <Recenter center={center} />
      {hasPoint && <Marker position={center} />}
    </MapContainer>
  )
}
