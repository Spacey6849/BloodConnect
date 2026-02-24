"use client"
import { useEffect, useMemo, useState } from 'react'

type Donor = {
  id: string
  name: string
  bloodType: string
  phone?: string | null
  distanceMeters: number
  score: number
  breakdown: { distance: number; reliability: number; responsiveness: number; donationHistory: number; urgencyBoost: number }
}

type AlertRow = { id: string; donorId: string; donorName: string; donorPhone?: string | null; status: string; notifiedAt: string; responseAt?: string | null }

export function RecommendedDonors({ requestId, bloodType, urgency }: { requestId: string; bloodType: string; urgency: 'critical'|'urgent'|'normal' }) {
  const [loading, setLoading] = useState(true)
  const [donors, setDonors] = useState<Donor[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [notifying, setNotifying] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const [recRes, alRes] = await Promise.all([
          fetch(`/api/requests/${requestId}/recommended-donors`, { cache: 'no-store' }),
          fetch(`/api/requests/${requestId}/alerts`, { cache: 'no-store' }),
        ])
        const recJson = await recRes.json()
        const alJson = await alRes.json()
        if (!alive) return
        setDonors((recJson.donors || []).slice(0, 20))
        setAlerts(alJson.alerts || [])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [requestId])

  const pendingByDonor = useMemo(() => new Set(alerts.filter(a => a.status === 'pending').map(a => a.donorId)), [alerts])

  async function notifySelected() {
    const ids = Object.entries(selected).filter(([,v]) => v).map(([id]) => id)
    if (!ids.length) return
    setNotifying(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/notify-donors`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donorIds: ids })
      })
      if (!res.ok) {
        console.error('notify failed')
      }
      // refresh alerts
      const alRes = await fetch(`/api/requests/${requestId}/alerts`, { cache: 'no-store' })
      const alJson = await alRes.json()
      setAlerts(alJson.alerts || [])
      setSelected({})
    } finally {
      setNotifying(false)
    }
  }

  if (loading) return <div className="text-xs text-slate-500">Loading recommendations…</div>
  if (!donors.length) return <div className="text-xs text-slate-500">No nearby eligible donors found.</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">Recommended donors</h4>
        <button
          onClick={notifySelected}
          disabled={notifying || Object.values(selected).every(v => !v)}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {notifying ? 'Sending…' : 'Notify selected'}
        </button>
      </div>
      <div className="max-h-64 overflow-auto divide-y divide-slate-200 border rounded-md">
        {donors.map(d => {
          const km = (d.distanceMeters / 1000)
          const isPending = pendingByDonor.has(d.id)
          return (
            <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-slate-50">
              <input type="checkbox" className="h-4 w-4" checked={!!selected[d.id]} onChange={e => setSelected(s => ({ ...s, [d.id]: e.target.checked }))} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-800">{d.name} <span className="ml-1 text-xs text-slate-500">{d.bloodType}</span></div>
                  <div className="text-xs text-slate-600">{km.toFixed(1)} km • Score {d.score.toFixed(2)}</div>
                </div>
                <div className="mt-1 grid grid-cols-5 gap-2 text-[10px] text-slate-600">
                  <div>Dist {Math.round(d.breakdown.distance*100)}%</div>
                  <div>Rel {Math.round(d.breakdown.reliability*100)}%</div>
                  <div>Resp {Math.round(d.breakdown.responsiveness*100)}%</div>
                  <div>Hist {Math.round(d.breakdown.donationHistory*100)}%</div>
                  <div>{d.breakdown.urgencyBoost>0?`Urg +${Math.round(d.breakdown.urgencyBoost*100)}%`:''}</div>
                </div>
              </div>
              {isPending && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">Pending</span>}
            </label>
          )
        })}
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-slate-700">Alerts</h5>
          <div className="max-h-40 overflow-auto divide-y divide-slate-200 border rounded-md">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 text-xs">
                <div className="text-slate-700">{a.donorName}</div>
                <div className="text-slate-500">{a.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
