"use client"
import { useEffect, useState } from 'react'
import { ApproveButton } from './approve-button.client'
import { UseOverlay } from './use-overlay.client'

type Bank = {
  id: string
  name: string
  address: string
  phone?: string | null
  totalQuantity: number
  distanceMeters: number
  score: number
}

export function RecommendedBanks({ requestId, remainingUnits, canUse, showApprove, canApprove, requestType }: { requestId: string; remainingUnits: number; canUse: boolean; showApprove: boolean; canApprove: boolean; requestType: string }) {
  const [loading, setLoading] = useState(true)
  const [banks, setBanks] = useState<Bank[]>([])
  const [usingId, setUsingId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<{ bankId: string; bankName: string } | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [responded, setResponded] = useState<Set<string>>(new Set())

  // Load recommended banks
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch(`/api/requests/${requestId}/recommended-banks`, { cache: 'no-store' })
        const json = await res.json()
        if (!alive) return
        setBanks((json.banks || []).slice(0, 10))
      } catch (e) {
        // ignore
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 20000)
    return () => { alive = false; clearInterval(t) }
  }, [requestId])

  // Poll fulfillments to know which banks are accepted
  useEffect(() => {
    let alive = true
    async function loadAccepted() {
      try {
        const res = await fetch(`/api/requests/${requestId}/fulfillments`, { cache: 'no-store' })
        const json = await res.json()
        if (!alive) return
        const acc = new Set<string>()
        const resp = new Set<string>()
        for (const f of (json?.fulfillments || [])) {
          if (f.blood_bank_id) resp.add(f.blood_bank_id)
          if (f.accepted_by_hospital && f.blood_bank_id) acc.add(f.blood_bank_id)
        }
        setAccepted(acc)
        setResponded(resp)
      } catch {
        // ignore
      }
    }
    loadAccepted()
    const t = setInterval(loadAccepted, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [requestId])

  async function useFromBank(bankId: string) {
    if (!remainingUnits || remainingUnits <= 0) return
    setUsingId(bankId)
    // Open overlay instead of direct use; AI compatibility is handled by backend + inventory endpoint
    const bank = banks.find(b => b.id === bankId)
    setOverlay({ bankId, bankName: bank?.name || 'Blood Bank' })
    setUsingId(null)
  }

  if (loading) return <div className="text-xs text-slate-500">Loading banks…</div>
  if (!banks.length) return <div className="text-xs text-slate-500">No nearby banks found.</div>

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">Recommended blood banks</h4>
        {showApprove && (
          canApprove ? (
            <ApproveButton requestId={requestId} />
          ) : (
            <span className="text-xs text-slate-500">Mark at least one delivery before approval</span>
          )
        )}
      </div>
      <div className="max-h-48 overflow-auto divide-y divide-slate-200 border rounded-md">
        {banks.map(b => (
          <div key={b.id} className="flex items-center justify-between p-2 text-sm">
            <div>
              <div className="font-medium text-slate-800">{b.name}</div>
              <div className="text-xs text-slate-500">{(b.distanceMeters/1000).toFixed(1)} km • Stock {b.totalQuantity}</div>
            </div>
            <div className="flex items-center gap-3">
              {b.phone && <a href={`tel:${b.phone}`} className="text-xs text-primary-600 hover:underline">Call</a>}
              {canUse && (
                <button
                  onClick={() => useFromBank(b.id)}
                  disabled={!!usingId || remainingUnits <= 0 || !accepted.has(b.id)}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >{usingId === b.id ? 'Opening…' : accepted.has(b.id) ? `Use ${remainingUnits}` : 'Approve first'}</button>
              )}
              {/* Accept/approve specific fulfillment from this bank before using */}
              {responded.has(b.id) && !accepted.has(b.id) ? (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/requests/${requestId}/accept-fulfillment`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankId: b.id })
                      })
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}))
                        alert(j.error || 'Failed to accept response')
                      } else {
                        // refresh accepted/ responded sets quickly
                        try {
                          const res2 = await fetch(`/api/requests/${requestId}/fulfillments`, { cache: 'no-store' })
                          const json = await res2.json()
                          const acc = new Set<string>()
                          const resp = new Set<string>()
                          for (const f of (json?.fulfillments || [])) {
                            if (f.blood_bank_id) resp.add(f.blood_bank_id)
                            if (f.accepted_by_hospital && f.blood_bank_id) acc.add(f.blood_bank_id)
                          }
                          setAccepted(acc)
                          setResponded(resp)
                        } catch {}
                        alert('Response accepted')
                      }
                    } catch (e) {
                      console.error(e)
                      alert('Unable to accept')
                    }
                  }}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-black/5"
                >Approve response</button>
              ) : (
                <span className="text-xs text-slate-400">Await response…</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {overlay && (
        <UseOverlay
          requestId={requestId}
          bankId={overlay.bankId}
          requestType={requestType}
          onClose={() => setOverlay(null)}
          onUsed={() => { if (typeof window !== 'undefined') window.location.reload() }}
        />
      )}
    </div>
  )
}
