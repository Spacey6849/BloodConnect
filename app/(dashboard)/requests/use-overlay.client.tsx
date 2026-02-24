"use client"

import { useEffect, useState } from 'react'

type InventoryItem = { bloodType: string; quantity: number; expiresAt: string | null; compatible: boolean }

export function UseOverlay({ requestId, bankId, requestType, onClose, onUsed }: { requestId: string; bankId: string; requestType: string; onClose: () => void; onUsed: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [using, setUsing] = useState(false)
  const [units, setUnits] = useState<number>(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const url = new URL(`/api/banks/${bankId}/inventory`, window.location.origin)
        url.searchParams.set('requestType', requestType)
        const res = await fetch(url.toString(), { cache: 'no-store' })
        const json = await res.json()
        if (!alive) return
        setItems(Array.isArray(json?.items) ? json.items : [])
      } finally { if (alive) setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [bankId, requestType])

  // Clamp units when switching selection to a type with fewer available units
  useEffect(() => {
    if (!selectedType) return
    const sel = items.find(i => i.bloodType === selectedType)
    if (!sel) return
    if (units > sel.quantity) setUnits(Math.max(1, sel.quantity))
  }, [selectedType, items])

  async function useSelected() {
    const compatibleAvailable = items.filter(i => i.compatible && i.quantity > 0)
    if (!compatibleAvailable.length) return
    if (!selectedType) return
    setUsing(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/use-bank`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankId, units, bloodType: selectedType })
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || 'Failed to use stock')
      }
      onUsed()
    } catch (e) {
      console.error(e)
      alert('Unable to use stock')
    } finally { setUsing(false) }
  }

  const hasCompatible = items.some(i => i.compatible && i.quantity > 0)
  const selectedItem = selectedType ? items.find(i => i.bloodType === selectedType) : undefined

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Select compatible blood from inventory</h3>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>
        <div className="mt-3 border rounded-md overflow-hidden">
          {loading ? (
            <div className="p-4 text-xs text-slate-500">Loading inventory…</div>
          ) : items.length ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Pick</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Compatibility</th>
                  <th className="px-3 py-2 text-left">Expires</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const disabled = !(it.compatible && it.quantity > 0)
                  const isSelected = selectedType === it.bloodType
                  return (
                    <tr key={it.bloodType} className={disabled ? 'opacity-60' : isSelected ? 'bg-emerald-100' : 'bg-emerald-50'}>
                      <td className="px-3 py-2">
                        <input
                          type="radio"
                          name="bloodTypePick"
                          disabled={disabled}
                          checked={isSelected}
                          onChange={() => setSelectedType(it.bloodType)}
                          aria-label={`Select ${it.bloodType}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{it.bloodType}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{it.compatible ? '✓ compatible' : '× not matched'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{it.expiresAt ? new Date(it.expiresAt).toLocaleDateString() : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-xs text-slate-500">No inventory found.</div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Units</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, selectedItem?.quantity ?? 50)}
              value={units}
              onChange={e => {
                const v = Math.max(1, Number(e.target.value) || 1)
                const max = Math.max(1, selectedItem?.quantity ?? 50)
                setUnits(Math.min(v, max))
              }}
              className="w-20 rounded border px-2 py-1 text-xs"
            />
          </div>
          <button
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={!hasCompatible || using || !selectedType}
            onClick={useSelected}
          >{using ? 'Using…' : 'Use selected'}</button>
        </div>
      </div>
    </div>
  )
}
