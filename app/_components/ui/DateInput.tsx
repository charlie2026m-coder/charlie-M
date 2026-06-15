"use client"

import { Input } from "./input"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { BsCalendar2 } from "react-icons/bs";
import { useState } from "react";
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
  side = 'top',
}: {
  children?: React.ReactNode,
  value?: DateRange | undefined,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  className?: string,
  inputStyle?: string,
  isError?: boolean,
  // Where the calendar opens relative to the field. Defaults to "top" (the
  // landing-page form sits low in the hero). On /rooms the form is sticky at
  // the top of the viewport, so it opens "bottom" — dropping down from the bar
  // instead of being flipped over the room cards by collision detection.
  side?: 'top' | 'bottom',
}) {
  const t = useTranslations();
  const [internalOpen, setInternalOpen] = useState(false)  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

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
          className={cn(className, "overflow-hidden  rounded-[20px] bg-white p-2 flex flex-col w-[350px] lg:w-[660px]")}
          align="center"
          side={side}
          sideOffset={10}
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
