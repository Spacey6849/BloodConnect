"use client"

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'donor' | 'hospital' | 'blood-bank' | 'ngo'>('donor')
  const [name, setName] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  // location removed from signup; users can set in Profile
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'account' | 'verify'>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameLabel = role === 'ngo'
    ? 'Organization name'
    : role === 'hospital'
    ? 'Hospital name'
    : role === 'blood-bank'
    ? 'Blood bank name'
    : 'Full name'

  const requestCode = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) throw new Error('Failed to send verification code')
      setStep('verify')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    await requestCode()
  }

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      if (!verifyRes.ok) throw new Error('Invalid or expired code')

      const createRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          name,
          blood_type: role === 'donor' ? bloodType : undefined,
          phone,
          address
        })
      })
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create account')
      }
  const next = searchParams.get('next') || '/overview'
  const safeNext = next.startsWith('/') ? next : '/overview'
    router.replace(safeNext)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
        <div className="grid w-full max-w-4xl gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-2">
        {/* Visual / copy side */}
        <div className="relative hidden items-center justify-center bg-gradient-to-br from-rose-500/10 via-amber-400/10 to-emerald-400/10 p-8 md:flex">
          <div className="relative z-10 space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-400/30 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> {step === 'account' ? 'Create account' : 'Verify email'}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Join BloodConnect</h2>
            <p className="text-sm text-slate-600">
              {step === 'account' ? 'Create your profile to coordinate donors, inventory, and emergency requests.' : 'Enter the 6‑digit code sent to your email to finish setting up your account.'}
            </p>
          </div>
          <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.18),transparent_40%),radial-gradient(circle_at_80%_50%,rgba(245,158,11,0.14),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.14),transparent_40%)]" />
        </div>

  {/* Form side */}
  <div className="p-6 md:p-8">
          <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-600">Sign up to coordinate donations and inventory.</p>

          {step === 'account' && (
            <form onSubmit={onCreateAccount} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <div>
                  <label className="text-sm font-medium text-slate-700">{nameLabel}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="donor">Donor</option>
                    <option value="hospital">Hospital</option>
                    <option value="blood-bank">Blood Bank</option>
                    <option value="ngo">NGO / Charity</option>
                  </select>
                </div>
                {role === 'donor' && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Blood type</label>
                    <select
                      value={bloodType}
                      onChange={e => setBloodType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                )}
                <div className={role === 'donor' ? '' : 'md:col-span-2'}>
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {null}
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Sending code…' : 'Continue'}</Button>
            </form>
          )}

      {step === 'verify' && (
            <form onSubmit={onVerify} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Verification code</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={requestCode}>Resend</Button>
                <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Verifying…' : 'Verify & create account'}</Button>
              </div>
            </form>
          )}

          {/* Map overlay removed from signup; location is editable in Profile */}

          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account? <Link href="/login" className="text-primary-600 hover:underline">Sign in</Link>
          </p>
        </div>
        </div>
      </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <SignupContent />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
