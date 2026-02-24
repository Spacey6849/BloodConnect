"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CancelButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onClick() {
    if (loading) return
    if (!confirm('Cancel this request?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to cancel')
      }
      router.refresh()
    } catch (e) {
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
      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
    >
      {loading ? 'Cancelling…' : 'Cancel'}
    </button>
  )
}
