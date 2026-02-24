"use client"

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

type Row = { blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'; horizon: '7d' | '30d'; units: number; computed_at: string }

const ForecastChart = dynamic(() => import('./forecast-chart.client'), { ssr: false })

export default function ForecastPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setErr(null)
    setLoading(true)
    try {
      const res = await fetch('/api/forecasts/mine', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      setRows(Array.isArray(json.items) ? json.items : [])
    } catch (e: any) {
      setErr(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const recompute = async () => {
    try {
      const res = await fetch('/api/forecasts/recompute', { method: 'POST' })
      if (res.ok) await load()
    } catch {}
  }

  useEffect(() => { load() }, [])

  const hasData = useMemo(() => rows && rows.length > 0, [rows])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Demand Forecast</h3>
          <p className="text-xs text-slate-500">Next 7 and 30 days per blood type</p>
        </div>
        <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={recompute}>
          Recompute
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-rose-600">{err}</div>
      ) : hasData ? (
        <ForecastChart rows={rows as any} />
      ) : (
        <div className="text-sm text-slate-500">No forecast data yet. Try Recompute.</div>
      )}
    </div>
  )
}
