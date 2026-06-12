'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/_components/ui/dialog'
import { Button } from '@/app/_components/ui/button'
import { MdPrint, MdDownload } from 'react-icons/md'
import type { SelfCheckoutToken } from '@/app/hooks/useSelfCheckout'

const COLOR_PRESETS = [
  { key: 'Black', hex: '000000' },
  { key: 'Gold', hex: 'A09060' },
  { key: 'Brown', hex: '8B7B70' },
  { key: 'Wine', hex: '923D4F' },
] as const

const CAPTIONS = {
  de: { line: 'Self-Check-out — einfach scannen & auschecken' },
  en: { line: 'Self-check-out — just scan & check out' },
} as const

type CaptionLang = 'de' | 'en' | 'both'

interface QrPrintDialogProps {
  item: SelfCheckoutToken | null
  onClose: () => void
}

export function QrPrintDialog({ item, onClose }: QrPrintDialogProps) {
  const [color, setColor] = useState<string>('000000')
  const [logo, setLogo] = useState(false)
  const [captionLang, setCaptionLang] = useState<CaptionLang>('both')

  if (!item) return null

  const qrSrc = (fmt: 'svg' | 'png', download = false) =>
    `/api/admin/self-checkout/qr/${encodeURIComponent(item.token)}?fmt=${fmt}&color=${color}` +
    (logo && fmt === 'svg' ? '&logo=1' : '') +
    (download ? '&download=1' : '')

  const captionLines =
    captionLang === 'both'
      ? [CAPTIONS.de.line, CAPTIONS.en.line]
      : [CAPTIONS[captionLang].line]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {/* Print: only the .sco-print-area survives; visibility (not display)
            keeps the layout intact while the Radix dialog is open. */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .sco-print-area, .sco-print-area * { visibility: visible !important; }
            .sco-print-area {
              position: fixed; inset: 0;
              display: flex !important; flex-direction: column;
              align-items: center; justify-content: center; gap: 18px;
            }
          }
        `}</style>

        <DialogHeader>
          <DialogTitle>QR — {item.unit_name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_PRESETS.map((p) => (
            <Button
              key={p.hex}
              variant={color === p.hex ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
              onClick={() => setColor(p.hex)}
            >
              <span
                className="inline-block w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: `#${p.hex}` }}
              />
              {p.key}
            </Button>
          ))}
          <Button
            variant={logo ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setLogo(!logo)}
            title="Hotel icon in the QR center (SVG & print only)"
          >
            Logo
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {(['de', 'en', 'both'] as const).map((l) => (
            <Button
              key={l}
              variant={captionLang === l ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs uppercase"
              onClick={() => setCaptionLang(l)}
            >
              {l === 'both' ? 'DE + EN' : l}
            </Button>
          ))}
        </div>

        {/* Preview = exactly what gets printed */}
        <div className="sco-print-area border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center gap-3 bg-white">
          <div className="text-base font-bold text-black">{item.unit_name}</div>
          <Image
            src={qrSrc('svg')}
            alt={`QR ${item.unit_name}`}
            width={220}
            height={220}
            unoptimized
            className="w-[220px] h-[220px]"
          />
          <div className="text-center">
            {captionLines.map((line) => (
              <p key={line} className="text-xs text-gray-600">
                {line}
              </p>
            ))}
          </div>
        </div>

        {logo && (
          <p className="text-[11px] text-gray-500 -mt-2">
            The logo is vector-only: it appears in SVG downloads and prints; PNG downloads come
            without it.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-black text-white hover:bg-gray-800"
            onClick={() => window.print()}
          >
            <MdPrint className="size-3.5" />
            Print
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
            <a href={qrSrc('svg', true)} download>
              <MdDownload className="size-3.5" />
              SVG
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
            <a href={qrSrc('png', true)} download>
              <MdDownload className="size-3.5" />
              PNG
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
