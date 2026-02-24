"use client"

import { useState } from 'react'

export default function DeleteCampButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onClick = async () => {
    setErr(null)
    setLoading(true)
    try {
  const res = await fetch(`/api/camps/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to delete')
  // Self-refresh to reflect deletion without requiring a server-passed handler
  location.reload()
    } catch (e: any) {
      setErr(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        title="Delete this camp"
      >
        {loading ? 'Deleting…' : 'Delete Camp'}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}
