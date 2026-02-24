"use client"

import { useRouter, useSearchParams } from 'next/navigation'

export function BloodFilter({ status, blood }: { status: string; blood: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const bloodTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="blood" className="text-sm text-slate-600">Blood type</label>
      <select
        id="blood"
        defaultValue={blood || ''}
        onChange={(e) => {
          const val = e.currentTarget.value
          router.replace(`/requests?status=${status}${val ? `&blood=${val}` : ''}`)
        }}
        className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">All</option>
        {bloodTypes.map(bt => (
          <option key={bt} value={bt}>{bt}</option>
        ))}
      </select>
    </div>
  )
}
