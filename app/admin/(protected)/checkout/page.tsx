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

// Room-agnostic QRs for the public in-room guide pages — one code per page
// serves every room (no token). API download links use plain <a> (same pattern
// as BulkZipButton — file responses, not page navigations, so no next/link).
const INFO_QR = '/api/admin/info-qr'
const PAGE_QRS = [
  {
    page: 'information',
    path: '/information',
    title: 'Information page QR',
    blurb: 'One code for all rooms — opens the public in-room guide at /information (no token, no login).',
  },
  {
    page: 'heatingandcooling',
    path: '/heatingandcooling',
    title: 'Heating & Cooling QR',
    blurb: 'One code for all rooms — opens the climate guide at /heatingandcooling (print next to the thermostat).',
  },
] as const

const qrUrl = (page: string, extra: string) => `${INFO_QR}?page=${page}&${extra}`

function PageQrCard({ page, path, title, blurb }: (typeof PAGE_QRS)[number]) {
  const preview = qrUrl(page, 'fmt=svg&logo=1')
  const svg = qrUrl(page, 'fmt=svg&logo=1&download=1')
  const png = qrUrl(page, 'fmt=png&download=1')
  return (
    <div className="flex items-center gap-4 border border-gray-200 rounded-xl p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview}
        alt={`QR code for the ${path} page`}
        className="size-28 shrink-0 border border-gray-100 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <h2 className="font-bold text-black">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5 break-all">{blurb}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button asChild variant="outline" size="sm" className="h-8">
            <a href={svg}>Download SVG</a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8">
            <a href={png}>Download PNG</a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8">
            <a href={path} target="_blank" rel="noopener noreferrer">Open page</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

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
            {/* Second, DIFFERENT sticker: scanning it asks for the surname and
                then opens the guest's cabinet (breakfast, late check-out, …).
                Never print it as the checkout code — different privilege. */}
            <BulkZipButton
              disabled={items.length === 0}
              endpoint="/api/admin/room-qr/zip"
              label="Booking QR"
            />
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
        {/* Room-agnostic QRs for the public guide pages — above the per-room grid. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PAGE_QRS.map((q) => (
            <PageQrCard key={q.page} {...q} />
          ))}
        </div>

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
