'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Toaster, toast } from 'sonner'
import { Button } from '@/app/_components/ui/button'
import { MdQrCode2, MdSync, MdArrowBack } from 'react-icons/md'
import {
  useSelfCheckoutList,
  useGenerateTokens,
  type SelfCheckoutToken,
} from '@/app/hooks/useSelfCheckout'
import { QrGrid } from '@/app/_components/admin/checkout/QrGrid'
import { QrPrintDialog } from '@/app/_components/admin/checkout/QrPrintDialog'
import { AuditLogTable } from '@/app/_components/admin/checkout/AuditLogTable'
import { BulkZipButton } from '@/app/_components/admin/checkout/BulkZipButton'

// Auth: enforced server-side by app/admin/(protected)/layout.tsx.
export default function AdminCheckoutPage() {
  const { data: items = [], isLoading } = useSelfCheckoutList()
  const generate = useGenerateTokens()
  const [printItem, setPrintItem] = useState<SelfCheckoutToken | null>(null)

  const unitNames = useMemo(
    () => new Map(items.map((i) => [i.unit_id, i.unit_name])),
    [items]
  )

  const handleGenerate = () => {
    generate.mutate(undefined, {
      onSuccess: (r) => {
        toast.success(`QR codes synced — ${r.units} rooms, ${r.created} new`)
      },
      onError: () => {
        toast.error('Sync failed — check Apaleo connectivity and try again')
      },
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white">
              <MdQrCode2 className="size-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">QR Self-Checkout</h1>
              <p className="text-xs text-gray-500">
                {isLoading ? 'Loading…' : `${items.length} rooms with QR codes`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              variant="outline"
              size="sm"
              className="gap-1.5 border-black text-black hover:bg-black hover:text-white h-8"
            >
              <MdSync className={`size-3.5 ${generate.isPending ? 'animate-spin' : ''}`} />
              {generate.isPending ? 'Syncing with Apaleo…' : 'Generate / Sync'}
            </Button>
            <BulkZipButton disabled={items.length === 0} />
            <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
              <Link href="/admin/rooms">
                <MdArrowBack className="size-3.5" />
                Rooms
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-8">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading QR codes…</div>
        ) : (
          <QrGrid items={items} onPrint={setPrintItem} />
        )}

        <AuditLogTable unitNames={unitNames} />
      </div>

      <QrPrintDialog item={printItem} onClose={() => setPrintItem(null)} />
    </div>
  )
}
