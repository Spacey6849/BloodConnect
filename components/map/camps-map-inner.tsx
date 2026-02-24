"use client"

import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export type CampPin = { id: string; name: string; address: string; start_date: string; end_date: string; lat?: number | null; lng?: number | null }

export default function CampsMapInner({ camps }: { camps: CampPin[] }) {
  const valid = useMemo(() =>
    camps.filter((c): c is Required<CampPin> => typeof c.lat === 'number' && typeof c.lng === 'number')
  , [camps])
  const center: LatLngTuple = valid.length
    ? [valid[0].lat as number, valid[0].lng as number]
    : [15.4909, 73.8278]

  return (
    <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      {valid.map(c => (
        <Marker key={c.id} position={[c.lat, c.lng] as LatLngTuple} icon={defaultIcon}>
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-slate-600">{c.address}</p>
              <p className="mt-1 text-xs">{new Date(c.start_date).toLocaleString()} – {new Date(c.end_date).toLocaleString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
