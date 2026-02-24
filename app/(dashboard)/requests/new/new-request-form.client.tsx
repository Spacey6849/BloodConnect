"use client"

import { LatLngPicker } from './latlng-picker.client'

export function NewRequestForm({ hospitalLat, hospitalLng }: { hospitalLat?: number; hospitalLng?: number }) {
  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget as HTMLFormElement
        const data = new FormData(form)
        const payload = {
          blood_type: String(data.get('blood_type') || ''),
          units_needed: Number(data.get('units_needed') || 0),
          urgency: String(data.get('urgency') || 'urgent'),
          latitude: data.get('latitude') ? Number(data.get('latitude')) : undefined,
          longitude: data.get('longitude') ? Number(data.get('longitude')) : undefined,
          address: String(data.get('address') || '')
        }
        const res = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) return window.location.replace('/requests')
        const err = await res.json().catch(() => ({} as any))
        alert(err.error || 'Failed to create request')
      }}
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm">Blood type</label>
            <select name="blood_type" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm">Units needed</label>
            <input name="units_needed" type="number" min={1} defaultValue={1} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm">Urgency</label>
            <select name="urgency" defaultValue="urgent" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Address</label>
            <input name="address" type="text" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
          <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-white">Create request</button>
        </div>
        <div>
          <LatLngPicker initialLat={hospitalLat} initialLng={hospitalLng} />
        </div>
      </div>
    </form>
  )
}
