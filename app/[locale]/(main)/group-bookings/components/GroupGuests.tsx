'use client'

import * as React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/app/_components/ui/popover'
import { Input } from '@/app/_components/ui/input'
import { Separator } from '@/app/_components/ui/separator'
import { ButtonIcon } from '@/app/_components/ui/ButtonIcon'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FiUsers } from 'react-icons/fi'

export type GuestCounts = { adults: number; children: number }

const MAX_ADULTS = 99
const MAX_CHILDREN = 30

/**
 * A count row with -/+ buttons AND a directly-editable number field, so the
 * guest can either step or just type the number. The field may be empty while
 * typing; it commits/clamps to [min, max] on blur.
 */
function CountStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const [raw, setRaw] = React.useState(String(value))
  React.useEffect(() => {
    setRaw(String(value))
  }, [value])

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="flex items-center justify-between">
      <span className="font-semibold text-black">{label}</span>
      <div className="flex items-center gap-2">
        <ButtonIcon symbol="-" disabled={value <= min} onClick={() => onChange(clamp(value - 1))} />
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={raw}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, '')
            setRaw(digits)
            if (digits !== '') onChange(clamp(parseInt(digits, 10)))
          }}
          onBlur={() => {
            const n = parseInt(raw, 10)
            const next = clamp(Number.isNaN(n) ? min : n)
            onChange(next)
            setRaw(String(next))
          }}
          className="w-10 text-center font-semibold bg-transparent outline-none border-b border-transparent focus:border-gray rounded-none"
        />
        <ButtonIcon symbol="+" disabled={value >= max} onClick={() => onChange(clamp(value + 1))} />
      </div>
    </div>
  )
}

/**
 * Group/corporate guest selector — same stepper UX as the landing-page Guests
 * picker (adults + children in a popover), but with group-sized limits, neutral
 * "children" wording, and counts you can type directly (not just step).
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
          <CountStepper
            label={labels.adults}
            value={value.adults}
            min={1}
            max={MAX_ADULTS}
            onChange={(adults) => onChange({ ...value, adults })}
          />
          <Separator />
          <CountStepper
            label={labels.children}
            value={value.children}
            min={0}
            max={MAX_CHILDREN}
            onChange={(children) => onChange({ ...value, children })}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
