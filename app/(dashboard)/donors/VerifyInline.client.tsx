"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyInlineClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/donors/verify-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to verify donor')
      }
      setEmail('')
      router.refresh()
    } catch (e) {
      console.error(e)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="email"
        placeholder="Donor email"
        className="h-9 w-56 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-9 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  )
}
