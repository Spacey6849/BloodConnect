"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RespondButton({ requestId, maxUnits }: { requestId: string; maxUnits?: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onClick() {
    if (loading) return
    setLoading(true)
    try {
      let units: number | undefined = undefined
      if (typeof maxUnits === 'number' && maxUnits > 0) {
        const input = prompt(`How many units to fulfill? (max ${maxUnits})`, String(maxUnits))
        if (input !== null) {
          const parsed = Number(input)
          if (Number.isFinite(parsed) && parsed > 0) units = Math.min(parsed, maxUnits)
        }
      }
      const res = await fetch(`/api/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(units ? { units } : {})
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to respond')
      }
      router.refresh()
    } catch (e) {
      // Optional: surface error to user; keeping minimal per request
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
    >
      {loading ? 'Responding…' : 'Respond'}
    </button>
  )
}
