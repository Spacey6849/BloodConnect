"use client"

import { useEffect, useMemo, useState } from 'react'
import { InventoryTable } from './inventory-table'
import type { InventoryRecord } from '@/lib/types'
import { supabaseBrowser } from '@/lib/supabase/client'

function classify(qty: number): 'sufficient' | 'low' | 'critical' {
  if (qty < 12) return 'critical'
  if (qty < 25) return 'low'
  return 'sufficient'
}

export function InventoryRealtime({ initial, bankId }: { initial: InventoryRecord[]; bankId?: string }) {
  const [records, setRecords] = useState<InventoryRecord[]>(initial)

  useEffect(() => {
    if (!bankId) return
    const supa = supabaseBrowser()
    const channel = supa
      .channel('inventory-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blood_inventory', filter: `blood_bank_id=eq.${bankId}` },
        (payload: any) => {
          const row = payload.new || payload.old
          if (!row || row.blood_bank_id !== bankId) return
          setRecords(prev => {
            const others = prev.filter(r => !(r.bloodType === row.blood_type))
            const rec: InventoryRecord = {
              id: row.id,
              bloodBankId: row.blood_bank_id,
              bloodType: row.blood_type,
              quantity: row.quantity,
              expiryDate: row.expiry_date,
              status: classify(row.quantity),
              lastUpdated: row.last_updated || new Date().toISOString()
            }
            return [...others, rec].sort((a,b) => a.bloodType.localeCompare(b.bloodType))
          })
        }
      )
      .subscribe()

    return () => {
      supa.removeChannel(channel)
    }
  }, [bankId])

  return <InventoryTable records={records} />
}
