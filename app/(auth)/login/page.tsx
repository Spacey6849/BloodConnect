"use client"

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to sign in')
      return
    }
  const next = searchParams.get('next') || '/overview'
  const safeNext = next.startsWith('/') ? next : '/overview'
    router.replace(safeNext)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="grid w-full max-w-4xl gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-2">
        {/* Visual / copy side */}
        <div className="relative hidden items-center justify-center bg-gradient-to-br from-rose-500/10 via-amber-400/10 to-emerald-400/10 p-8 md:flex">
          <div className="relative z-10 space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-400/30 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Live network
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back to BloodConnect</h2>
            <p className="text-sm text-slate-600">Coordinate donors, inventory, and emergency requests in one place.</p>
          </div>
          <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.18),transparent_40%),radial-gradient(circle_at_80%_50%,rgba(245,158,11,0.14),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.14),transparent_40%)]" />
        </div>
        {/* Form side */}
        <div className="p-6 md:p-8">
          <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">Log in to access your BloodConnect dashboard.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            No account? <Link href="/signup" className="text-primary-600 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginContent />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
