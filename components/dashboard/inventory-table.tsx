import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryRecord } from '@/lib/types'
import { formatDate } from '@/lib/utils/date'
import { Droplet } from 'lucide-react'

function statusConfig(record: InventoryRecord) {
  switch (record.status) {
    case 'critical':
      return { label: 'Critical', variant: 'danger' as const }
    case 'low':
      return { label: 'Low', variant: 'warning' as const }
    default:
      return { label: 'Healthy', variant: 'success' as const }
  }
}

export function InventoryTable({ records }: { records: InventoryRecord[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Droplet className="h-4 w-4 text-primary-500" />
          Blood Inventory Snapshot
        </CardTitle>
        <p className="text-sm text-slate-500">Last updated a few seconds ago via realtime stream</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium">Units</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Soonest Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map(record => {
              const status = statusConfig(record)
              return (
                <tr key={record.id} className="transition hover:bg-slate-50/80">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600">
                        {record.bloodType}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{record.bloodType}</p>
                        <p className="text-xs text-slate-500">Bank ID: {record.bloodBankId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">{record.quantity}</p>
                    <p className="text-xs text-slate-500">Units available</p>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-slate-700">{formatDate(record.expiryDate)}</p>
                    <p className="text-xs text-slate-500">
                      Updated {formatDate(record.lastUpdated)}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
