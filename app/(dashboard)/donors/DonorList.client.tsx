"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRelative } from '@/lib/utils/date'
import type { DonorListItem } from '@/components/dashboard/donor-availability'

export type DonorListClientProps = {
  donors: (DonorListItem & { verifiedByMe?: boolean })[]
  isBank?: boolean
  bankId?: string
}

export default function DonorListClient({ donors = [], isBank }: DonorListClientProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (!donors.length) return <p className="text-sm text-slate-500">No verified donors yet.</p>

  async function verify(donorId: string) {
    if (busyId) return
    setBusyId(donorId)
    try {
      const res = await fetch(`/api/donors/${donorId}/verify`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to verify donor')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function unverify(donorId: string) {
    if (busyId) return
    setBusyId(donorId)
    try {
      const res = await fetch(`/api/donors/${donorId}/verify`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove verification')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      {donors.map(d => (
        <div key={d.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">{d.bloodType}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                <p className="text-xs text-slate-500">Last donation {formatRelative(d.lastDonation)}</p>
              </div>
            </div>
            {isBank && (
              d.verifiedByMe ? (
                <button
                  type="button"
                  onClick={() => unverify(d.id)}
                  disabled={busyId === d.id}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {busyId === d.id ? 'Removing…' : 'Remove Verification'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => verify(d.id)}
                  disabled={busyId === d.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyId === d.id ? 'Verifying…' : 'Verify'}
                </button>
              )
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {d.address && <span>{d.address}</span>}
            {d.donationCount != null && <span>Donations: {d.donationCount}</span>}
            {d.phone && <span>Contact: {d.phone}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
