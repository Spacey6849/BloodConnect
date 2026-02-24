"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeliverButton({ fulfillmentId }: { fulfillmentId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onClick() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/fulfillments/${fulfillmentId}/deliver`, { method: 'POST' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to mark delivered')
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
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {loading ? 'Marking…' : 'Mark delivered'}
    </button>
  )
}
