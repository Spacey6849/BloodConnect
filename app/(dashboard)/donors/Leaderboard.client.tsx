"use client"
import { useEffect, useState } from 'react'

type Entry = { donorId: string; name: string; bloodType?: string | null; phone?: string | null; score: number; breakdown: { reliability: number; responsiveness: number; donation: number } }

export default function LeaderboardClient() {
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/leaderboard/donors?limit=5', { cache: 'no-store' })
        const json = await res.json()
        if (!alive) return
        setRows(json.donors || [])
      } finally { if (alive) setLoading(false) }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>
  if (!rows.length) return <p className="text-sm text-slate-500">No contributors to show yet.</p>
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.donorId} className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">#{i+1} {r.name} <span className="ml-1 text-xs text-slate-500">{r.bloodType || ''}</span></p>
            <p className="text-xs text-slate-600">Score {r.score.toFixed(2)}</p>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] text-slate-600">
            <div>Rel {Math.round(r.breakdown.reliability*100)}%</div>
            <div>Resp {Math.round(r.breakdown.responsiveness*100)}%</div>
            <div>Don {Math.round(r.breakdown.donation*100)}%</div>
          </div>
        </div>
      ))}
    </div>
  )
}
