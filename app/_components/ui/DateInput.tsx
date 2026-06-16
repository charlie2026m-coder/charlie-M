"use client"

import { Input } from "./input"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { BsCalendar2 } from "react-icons/bs";
import { useState, useEffect } from "react";
import dayjs from 'dayjs';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const getValue = (date: Date | undefined) => {
  if (!date) return ''
  return dayjs(date).format('DD MMM')
}

export function DateInput({
  children,
  value,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className = '',
  inputStyle = '',
  isError = false,
  frosted = false,
  desktopAlign = 'center',
  compact = false,
  panelId,
}: {
  children?: React.ReactNode,
  value?: DateRange | undefined,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  className?: string,
  inputStyle?: string,
  isError?: boolean,
  // When true the panel is semi-transparent/frosted so content behind it stays
  // visible (used on /rooms, where the calendar overlays the room cards).
  frosted?: boolean,
  // Horizontal anchor on desktop. Default 'center' (field on the left of a wide
  // form). Use 'end' when the field sits on the right (e.g. the booking card's
  // right column) so the wide panel opens leftward instead of off-screen.
  desktopAlign?: 'start' | 'center' | 'end',
  // When true the desktop panel stays single-month width (~360px) instead of
  // the wide two-month 660px. Use it in narrow columns (the room booking card)
  // so the panel doesn't spill far across the page.
  compact?: boolean,
  // Stamps `data-cal-id` on the popover panel so a caller with multiple
  // popovers on the page (e.g. the home page's two search forms) can scroll to
  // ITS own calendar instead of a global querySelector grabbing the first one.
  panelId?: string,
}) {
  const t = useTranslations();
  const [internalOpen, setInternalOpen] = useState(false)  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  // Center the panel under the field on desktop; on mobile anchor it to the
  // field's left edge so the viewport-capped width can't run off-screen.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const formattedValue = (value?.from || value?.to) ? `${getValue(value?.from)} - ${getValue(value?.to)}` : ''

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex" suppressHydrationWarning>
            <div className='hidden md:flex gap-2 text-xs absolute -top-2 left-5 bg-white px-1'>
              <div className='pr-2 border-r border-black '>{t('dateInput.checkIn')}  </div>
              <div >{t('dateInput.checkOut')}</div>
            </div>
            <BsCalendar2 className={cn("flex absolute top-1/2 left-3 -translate-y-1/2 md:hidden size-4", isError && "text-red-500")} />
            <Input
              id="date"
              value={formattedValue}
              placeholder={t('dateInput.chooseDate')}
              className={cn(
                "rounded-full h-10 border-white shadow-none text-sm md:text-base  md:border-black pl-8 md:pl-3 pr-3 cursor-pointer",
                isError && "!border-red-500 focus:border-red-500 !ring-red-500/20 focus:ring-red-500",
                inputStyle
              )}
              readOnly
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setOpen(true)
                }
              }}
            />
            <Button
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-0 size-6 -translate-y-1/2 pointer-events-none"
            >
              <BsCalendar2 className={cn("hidden md:flex size-4 text-brown", isError && "text-red-500")} />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            className,
            // Width is capped to the viewport on mobile so the panel can never
            // run off the screen edge. From lg up: a single-month ~360px when
            // `compact` (narrow columns), otherwise the wide 660px two-month.
            "overflow-hidden rounded-[20px] p-2 flex flex-col w-[calc(100vw-3.5rem)] max-w-[340px]",
            compact ? "lg:w-[360px] lg:max-w-[360px]" : "lg:w-[660px] lg:max-w-none",
            // Smoother, slightly slower entrance than the default popover.
            "data-[state=open]:duration-300 data-[state=open]:ease-out",
            frosted ? "bg-white/92 backdrop-blur-md" : "bg-white",
          )}
          data-cal-id={panelId}
          // Desktop: center the panel under the field (don't shift it right).
          // Mobile: anchor to the field's LEFT edge so the viewport-capped width
          // never runs off-screen. Always force it downward (avoidCollisions=
          // false) so it never flips up, and track the anchor every frame for
          // smooth movement with the sticky bar on scroll.
          align={isDesktop ? desktopAlign : "start"}
          side="bottom"
          sideOffset={10}
          avoidCollisions={false}
          updatePositionStrategy="always"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('input[id="date"]') || target.closest('[data-slot="popover-content"]')) {
              e.preventDefault()
            }
          }}
        >
          {children}
        </PopoverContent>
      </Popover>
    </div>
  )
}
