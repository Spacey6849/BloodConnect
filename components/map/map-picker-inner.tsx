"use client"

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet'

type Props = {
  pos: [number, number]
  onPosChange: (lat: number, lng: number) => void
}

export function MapPickerInner({ pos, onPosChange }: Props) {
  useEffect(() => {
    // Ensure default marker icons render correctly
    import('leaflet').then(L => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      })
    })
  }, [])

  function ClickCapture() {
    useMapEvents({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      click(e: any) {
        onPosChange(e.latlng.lat, e.latlng.lng)
      }
    })
    return null
  }

  return (
    <>
    <MapContainer center={pos} zoom={13} className="h-full w-full map-picker-inner" scrollWheelZoom zoomControl={false}>
      <ClickCapture />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <ZoomControl position="topright" />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Marker position={pos} draggable eventHandlers={{ dragend: (e: any) => {
        const m = e.target
        const ll = m.getLatLng()
        onPosChange(ll.lat, ll.lng)
      } }} />
    </MapContainer>
    {/* Center the zoom control vertically on the right */}
    <style jsx global>{`
      .map-picker-inner .leaflet-top.leaflet-right {
        top: 50% !important;
        transform: translateY(-50%);
      }
    `}</style>
    </>
  )
}
