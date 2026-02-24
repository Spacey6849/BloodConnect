"use client"

import dynamic from 'next/dynamic'
import type { CampPin } from './camps-map-inner'

const Inner = dynamic(() => import('./camps-map-inner'), { ssr: false })

export function CampsMap(props: { camps: CampPin[] }) {
  return <Inner {...props} />
}
