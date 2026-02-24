"use client"

import { useEffect, useMemo, useState } from 'react'

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
const BLOOD_TYPES: BloodType[] = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function ManageInventory() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<{ blood_type: BloodType; quantity: number; expiry_date: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      // Default template for all blood types
      const plus14 = new Date(); plus14.setDate(plus14.getDate() + 14)
      const defaultDate = plus14.toISOString().slice(0,10)
      const base = BLOOD_TYPES.map(bt => ({ blood_type: bt, quantity: 0, expiry_date: defaultDate }))
      try {
        const res = await fetch('/api/inventory/mine')
        if (res.ok) {
          const data = await res.json()
          const map: Record<string, { quantity: number; expiry_date: string }> = {}
          for (const it of data.items || []) {
            map[it.blood_type] = {
              quantity: it.quantity ?? 0,
              expiry_date: it.expiry_date?.slice(0,10) ?? defaultDate
            }
          }
          if (!cancelled) {
            setRows(base.map(row => map[row.blood_type] ? { blood_type: row.blood_type, ...map[row.blood_type] } : row))
          }
        } else {
          // fallback to defaults
          if (!cancelled) setRows(base)
        }
      } catch {
        if (!cancelled) setRows(base)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open])

  async function save() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/inventory/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update inventory')
      }
      setOpen(false)
      // hard refresh to re-fetch server data
      location.reload()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add / Update Inventory</button>
      {open && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Manage Blood Inventory</p>
              <button onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-black/5">Close</button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rows.map((r, idx) => (
                  <div key={r.blood_type} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">{r.blood_type}</span>
                        <span className="text-sm font-medium text-slate-900">{r.blood_type}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600">Quantity (units)</label>
                        <input type="number" min={0} value={r.quantity} onChange={e => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                          setRows(prev => prev.map((x,i) => i===idx ? { ...x, quantity: isNaN(val) ? 0 : val } : x))
                        }} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">Soonest Expiry</label>
                        <input type="date" value={r.expiry_date} onChange={e => setRows(prev => prev.map((x,i) => i===idx ? { ...x, expiry_date: e.target.value } : x))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-black/5">Cancel</button>
              <button onClick={save} disabled={loading} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">{loading ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
