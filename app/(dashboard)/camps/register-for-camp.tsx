"use client"

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function RegisterForCamp({ campId, isRegistered: initial }: { campId: string; isRegistered: boolean }) {
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setError(null)
    try {
      const res = await fetch(`/api/camps/${campId}/register`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to register')
      }
      setIsRegistered(true)
      startTransition(() => router.refresh())
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isRegistered ? undefined : onClick}
        disabled={isRegistered || pending}
        className={`rounded-lg px-3 py-1 text-sm font-medium ${isRegistered ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
      >
        {isRegistered ? 'Registered' : (pending ? 'Registering…' : 'Register')}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
