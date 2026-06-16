'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { Button } from '@/app/_components/ui/button'
import { MdFolderZip } from 'react-icons/md'
import { COLOR_PRESETS } from './qrPresets'

/** Download all room QR codes as one ZIP (svg or png). */
export function BulkZipButton({ disabled }: { disabled?: boolean }) {
  const [fmt, setFmt] = useState<'svg' | 'png'>('svg')
  const [color, setColor] = useState<string>('000000')
  const [logo, setLogo] = useState(false)

  const href =
    `/api/admin/self-checkout/zip?fmt=${fmt}&color=${color}` +
    (logo && fmt === 'svg' ? '&logo=1' : '')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8" disabled={disabled}>
          <MdFolderZip className="size-3.5" />
          ZIP
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="flex items-center gap-1.5">
          {(['svg', 'png'] as const).map((f) => (
            <Button
              key={f}
              variant={fmt === f ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs uppercase"
              onClick={() => setFmt(f)}
            >
              {f}
            </Button>
          ))}
          <Button
            variant={logo ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={fmt === 'png'}
            title={fmt === 'png' ? 'Logo is available for SVG only' : 'Hotel icon in the QR center'}
            onClick={() => setLogo(!logo)}
          >
            Logo
          </Button>
        </div>
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
        </div>
        <Button asChild size="sm" className="w-full h-8 bg-black text-white hover:bg-gray-800">
          <a href={href}>Download ZIP ({fmt.toUpperCase()})</a>
        </Button>
      </PopoverContent>
    </Popover>
  )
}
