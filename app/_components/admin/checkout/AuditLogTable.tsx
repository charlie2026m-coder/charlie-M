'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/_components/ui/table'
import { useSelfCheckoutLog } from '@/app/hooks/useSelfCheckout'

interface AuditLogTableProps {
  /** unit_id → room name, for readable rows */
  unitNames: Map<string, string>
}

function resultBadge(result: string) {
  let cls = 'bg-gray-100 text-gray-700'
  if (result === 'ok') cls = 'bg-green-100 text-green-800'
  else if (result === 'needs_confirm') cls = 'bg-amber-100 text-amber-800'
  else if (result.startsWith('blocked:') || result.startsWith('error:'))
    cls = 'bg-red-100 text-red-800'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {result}
    </span>
  )
}

function formatBerlin(at: string): string {
  const d = new Date(at)
  if (isNaN(d.getTime())) return at
  return d.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AuditLogTable({ unitNames }: AuditLogTableProps) {
  const { data: entries, isLoading } = useSelfCheckoutLog()

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-base font-bold text-black">Checkout log</h2>
        <span className="text-xs text-gray-500">auto-refreshes every 15s</span>
      </div>
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-bold text-black w-[150px]">Time</TableHead>
              <TableHead className="font-bold text-black">Room</TableHead>
              <TableHead className="font-bold text-black">Guest</TableHead>
              <TableHead className="font-bold text-black w-[180px]">Result</TableHead>
              <TableHead className="font-bold text-black w-[140px]">Reservation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-500">
                  Loading…
                </TableCell>
              </TableRow>
            ) : !entries || entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-500">
                  No checkout attempts yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e, i) => (
                <TableRow key={`${e.at}-${i}`}>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {formatBerlin(e.at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900">
                    {(e.unit_id && unitNames.get(e.unit_id)) || e.unit_id || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">{e.guest || '—'}</TableCell>
                  <TableCell>{resultBadge(e.result)}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">
                    {e.reservation_id || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
