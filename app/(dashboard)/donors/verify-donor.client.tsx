"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function VerifyDonorButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onClick() {
    if (loading) return
    const email = prompt('Enter donor email to verify:')?.trim()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/donors/verify-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to verify donor')
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" size="sm" onClick={onClick} disabled={loading}>
      {loading ? 'Verifying…' : 'Verify Donor'}
    </Button>
  )
}
