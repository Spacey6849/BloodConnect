"use client"

import { useEffect, useState } from 'react'

type Submission = {
  id: string
  donor_id: string
  blood_bank_id: string
  blood_type: string
  units: number
  submitted_at: string
  status: 'pending' | 'accepted' | 'declined'
}

export default function SubmissionsReview({ bankId }: { bankId: string }) {
  const [items, setItems] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/donations/submissions?bankId=${bankId}&status=pending`, { cache: 'no-store' })
      const j = await res.json().catch(()=>({ submissions: [] }))
      setItems(j.submissions || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bankId])

  async function act(id: string, action: 'accept'|'decline') {
    if (actingId) return
    setActingId(id)
    try {
      const res = await fetch(`/api/donations/submissions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action })
      })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        alert(j.error || 'Failed to update submission')
      }
      await load()
    } finally { setActingId(null) }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Donation Submissions</h3>
        <button onClick={load} className="text-xs text-primary-600 hover:underline">Refresh</button>
      </div>
      <div className="rounded-lg border divide-y">
        {loading ? (
          <div className="p-3 text-xs text-slate-500">Loading…</div>
        ) : items.length ? items.map(s => (
          <div key={s.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium text-slate-800">{s.blood_type} • {s.units} unit(s)</div>
              <div className="text-xs text-slate-500">Submitted {new Date(s.submitted_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={actingId === s.id} onClick={() => act(s.id, 'decline')} className="rounded-md border px-2 py-1 text-xs">Decline</button>
              <button disabled={actingId === s.id} onClick={() => act(s.id, 'accept')} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white">Accept</button>
            </div>
          </div>
        )) : (
          <div className="p-3 text-xs text-slate-500">No pending submissions.</div>
        )}
      </div>
    </div>
  )
}
