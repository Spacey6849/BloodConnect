"use client"

import React, { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'

export type ForecastRow = {
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  horizon: '7d' | '30d'
  units: number
  computed_at: string
}

type Props = {
  rows: ForecastRow[]
  height?: number
}

const BLOOD_TYPES: ForecastRow['blood_type'][] = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function ForecastChart({ rows, height = 360 }: Props) {
  const [horizon, setHorizon] = useState<'7d' | '30d' | 'both'>('both')
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(BLOOD_TYPES.map(bt => [bt, true])))

  const categories = useMemo(() => BLOOD_TYPES.filter(bt => selected[bt]), [selected])

  const data7 = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) if (r.horizon === '7d') map.set(r.blood_type, Number(r.units) || 0)
    return categories.map(bt => map.get(bt) ?? 0)
  }, [rows, categories])

  const data30 = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) if (r.horizon === '30d') map.set(r.blood_type, Number(r.units) || 0)
    return categories.map(bt => map.get(bt) ?? 0)
  }, [rows, categories])

  const option = useMemo(() => {
    const series: any[] = []
    const show7 = horizon === '7d' || horizon === 'both'
    const show30 = horizon === '30d' || horizon === 'both'
    if (show7) {
      series.push({
        name: '7 days', type: 'bar', data: data7,
        itemStyle: { color: '#0ea5e9' },
        emphasis: { focus: 'series' },
        barGap: '20%'
      })
    }
    if (show30) {
      series.push({
        name: '30 days', type: 'bar', data: data30,
        itemStyle: { color: '#22c55e' },
        emphasis: { focus: 'series' },
        barGap: '20%'
      })
    }
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0 },
      toolbox: {
        feature: {
          saveAsImage: {},
          dataView: { readOnly: true },
          magicType: { type: ['line', 'bar'] }
        },
        right: 10
      },
      grid: { left: 16, right: 16, bottom: 48, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisTick: { alignWithLabel: true }
      },
      yAxis: { type: 'value', name: 'Units' },
      dataZoom: [
        { type: 'slider', show: categories.length > 6, start: 0, end: 100 },
        { type: 'inside' }
      ],
      series
    }
  }, [categories, data7, data30, horizon])

  const toggleType = (bt: string) => setSelected(prev => ({ ...prev, [bt]: !prev[bt] }))

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            className={`rounded-md px-3 py-1.5 text-sm border ${horizon==='both' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 hover:bg-slate-50'}`}
            onClick={() => setHorizon('both')}
          >Both</button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm border ${horizon==='7d' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 hover:bg-slate-50'}`}
            onClick={() => setHorizon('7d')}
          >7 days</button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm border ${horizon==='30d' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 hover:bg-slate-50'}`}
            onClick={() => setHorizon('30d')}
          >30 days</button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {BLOOD_TYPES.map(bt => (
            <button
              key={bt}
              className={`rounded-md border px-2 py-1 text-xs ${selected[bt] ? 'bg-white border-slate-300 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
              onClick={() => toggleType(bt)}
              title={selected[bt] ? `Hide ${bt}` : `Show ${bt}`}
            >{bt}</button>
          ))}
        </div>
      </div>
      <ReactECharts option={option} style={{ height }} notMerge={true} lazyUpdate={true} theme={undefined} />
    </div>
  )
}
