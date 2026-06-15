'use client'

import * as React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/app/_components/ui/popover'
import { Input } from '@/app/_components/ui/input'
import { Separator } from '@/app/_components/ui/separator'
import { ButtonIcon } from '@/app/_components/ui/ButtonIcon'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FiUsers } from 'react-icons/fi'
import { cn } from '@/lib/utils'

export type GuestCounts = { adults: number; children: number }

const MAX_ADULTS = 99
const MAX_CHILDREN = 30

/**
 * Group/corporate guest selector — same stepper UX as the landing-page Guests
 * picker (adults + children in a popover), but with group-sized limits and
 * neutral "children" wording instead of the single-baby-bed semantics the
 * room-booking Guests component enforces.
 */
export function GroupGuests({
  value,
  onChange,
  labels,
}: {
  value: GuestCounts
  onChange: (v: GuestCounts) => void
  labels: { adults: string; children: string }
}) {
  const [open, setOpen] = React.useState(false)

  const summary =
    value.children > 0
      ? `${value.adults} ${labels.adults} · ${value.children} ${labels.children}`
      : `${value.adults} ${labels.adults}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer">
          <FiUsers className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-blue" />
          <Input
            value={summary}
            readOnly
            className="h-12 rounded-full border-gray bg-white pl-12 pr-10 shadow-none text-base cursor-pointer"
          />
          <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none">
            {open ? <ChevronUp className="size-4 text-brown" /> : <ChevronDown className="size-4 text-brown" />}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={10}
        className="rounded-[20px] bg-white p-4 min-w-[260px]"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-black">{labels.adults}</span>
            <div className="flex items-center gap-2">
              <ButtonIcon
                symbol="-"
                disabled={value.adults <= 1}
                onClick={() => onChange({ ...value, adults: Math.max(1, value.adults - 1) })}
              />
              <span className="font-semibold min-w-[20px] text-center">{value.adults}</span>
              <ButtonIcon
                symbol="+"
                disabled={value.adults >= MAX_ADULTS}
                onClick={() => onChange({ ...value, adults: value.adults + 1 })}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-black">{labels.children}</span>
            <div className="flex items-center gap-2">
              <ButtonIcon
                symbol="-"
                disabled={value.children <= 0}
                onClick={() => onChange({ ...value, children: Math.max(0, value.children - 1) })}
              />
              <span className="font-semibold min-w-[20px] text-center">{value.children}</span>
              <ButtonIcon
                symbol="+"
                disabled={value.children >= MAX_CHILDREN}
                onClick={() => onChange({ ...value, children: value.children + 1 })}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
