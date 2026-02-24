import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { InventoryRealtime } from '@/components/dashboard/inventory-realtime.client'
import { EmergencyRequests } from '@/components/dashboard/emergency-requests'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/date'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
const ManageInventory = dynamic(() => import('./manage-inventory'), { ssr: false })

export const metadata = {
  title: 'BloodConnect | Inventory Management'
}

export default async function InventoryPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  const admin = supabaseAdmin()

  // Only blood banks may access inventory
  if (!session || session.role !== 'blood-bank') {
    redirect('/overview')
  }

  // Fetch current bank's inventory if role is blood-bank, else show empty list
  let records: {
    id: string
    bloodBankId: string
    bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
    quantity: number
    expiryDate: string
    status: 'sufficient' | 'low' | 'critical'
    lastUpdated: string
  }[] = []

  let canManage = false
  let bankId: string | undefined
  let history: { id: string; createdAt: string; bloodType: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-'; units: number; hospitalName: string }[] = []
  let historyTotalUnits = 0
  if (session?.role === 'blood-bank') {
    canManage = true
    bankId = session.sub
    const { data } = await admin
      .from('blood_inventory')
      .select('id, blood_bank_id, blood_type, quantity, expiry_date, last_updated')
      .eq('blood_bank_id', session.sub)
      .order('blood_type', { ascending: true })

    records = (data || []).map(r => ({
      id: r.id,
      bloodBankId: r.blood_bank_id,
      bloodType: r.blood_type,
      quantity: r.quantity,
      expiryDate: r.expiry_date,
      status: r.quantity < 12 ? 'critical' : r.quantity < 25 ? 'low' : 'sufficient',
      lastUpdated: r.last_updated
    }))

    // Load recent fulfillment history (donations made by this blood bank)
    const { data: fulf } = await admin
      .from('request_fulfillments')
      .select('id, hospital_id, blood_type, units, created_at')
      .eq('blood_bank_id', session.sub)
      .order('created_at', { ascending: false })
      .limit(25)

    const list = fulf || []
    historyTotalUnits = list.reduce((sum, f) => sum + (f.units ?? 0), 0)
    const hospitalIds = Array.from(new Set(list.map(f => f.hospital_id).filter(Boolean))) as string[]
    let hospitalMap = new Map<string, string>()
    if (hospitalIds.length > 0) {
      const { data: hospitals } = await admin
        .from('users')
        .select('id, name')
        .in('id', hospitalIds)
      for (const h of hospitals || []) hospitalMap.set(h.id, h.name)
    }
    history = list.map(f => ({
      id: f.id,
      createdAt: f.created_at,
      bloodType: f.blood_type,
      units: f.units,
      hospitalName: hospitalMap.get(f.hospital_id) || 'Hospital'
    }))
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Inventory Command Center</h1>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Monitor stock levels, expiry windows, and critical alerts at a glance.</p>
          {canManage && <ManageInventory />}
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <InventoryRealtime initial={records} bankId={bankId} />
          {canManage && (
            <Card className="h-full">
              <CardHeader className="flex flex-col gap-1">
                <CardTitle className="text-base font-semibold">Fulfillment History</CardTitle>
                <p className="text-sm text-slate-500">Recent donations from your bank to hospitals. Total units: {historyTotalUnits}</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-600 py-4">No fulfillments yet.</p>
                ) : (
                  <table className="min-w-full table-fixed text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4 font-medium">Date</th>
                        <th className="pb-3 pr-4 font-medium">Hospital</th>
                        <th className="pb-3 pr-4 font-medium">Blood Type</th>
                        <th className="pb-3 pr-4 font-medium">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map(item => (
                        <tr key={item.id} className="transition hover:bg-slate-50/80">
                          <td className="py-3 pr-4">{formatDateTime(item.createdAt)}</td>
                          <td className="py-3 pr-4">{item.hospitalName}</td>
                          <td className="py-3 pr-4">{item.bloodType}</td>
                          <td className="py-3 pr-4 font-semibold">{item.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <EmergencyRequests />
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Restock Guidance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>• Prioritise O- and B- replenishment within 24 hours.</p>
              <p>• Cross-check inventory with upcoming elective surgeries.</p>
              <p>• Pivot mobile drives toward regions with persistent deficits.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
