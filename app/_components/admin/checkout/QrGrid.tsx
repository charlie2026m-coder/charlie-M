'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Input } from '@/app/_components/ui/input'
import { Button } from '@/app/_components/ui/button'
import { MdContentCopy, MdPrint } from 'react-icons/md'
import type { SelfCheckoutToken } from '@/app/hooks/useSelfCheckout'

interface QrGridProps {
  items: SelfCheckoutToken[]
  onPrint: (item: SelfCheckoutToken) => void
}

export function QrGrid({ items, onPrint }: QrGridProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.unit_name.toLowerCase().includes(q))
  }, [items, search])

  const copyUrl = async (item: SelfCheckoutToken) => {
    try {
      await navigator.clipboard.writeText(item.url)
      toast.success(`URL copied — ${item.unit_name}`)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <div>
      <div className="mb-3 max-w-xs">
        <Input
          placeholder="Search room…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {items.length === 0
            ? 'No QR codes yet — click "Generate / Sync" to create one per room.'
            : 'No rooms match the search.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((item) => (
            <div
              key={item.token}
              className="border-2 border-gray-200 rounded-lg p-3 flex flex-col items-center gap-2 bg-white"
            >
              {/* QR endpoint is admin-only and same-origin; plain img keeps it simple */}
              <Image
                src={`/api/admin/self-checkout/qr/${encodeURIComponent(item.token)}?fmt=svg`}
                alt={`QR ${item.unit_name}`}
                width={120}
                height={120}
                unoptimized
                className="w-full max-w-[120px] aspect-square"
              />
              <div className="text-sm font-bold text-black text-center truncate w-full" title={item.unit_name}>
                {item.unit_name}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => copyUrl(item)}
                  title={item.url}
                >
                  <MdContentCopy className="size-3" />
                  URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs border-black text-black hover:bg-black hover:text-white"
                  onClick={() => onPrint(item)}
                >
                  <MdPrint className="size-3" />
                  Print
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
