"use client"

import { Input } from "./input"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { BsCalendar2 } from "react-icons/bs";
import { useState } from "react";
import dayjs from 'dayjs';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const getValue = (date: Date | undefined) => {
  if (!date) return ''
  return dayjs(date).format('DD MMM YYYY')
}

export function DateInput({
  children,
  value,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className = '',
  isError = false,
}: {
  children?: React.ReactNode,
  value?: DateRange | undefined,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  className?: string,
  isError?: boolean,
}) {
  const [internalOpen, setInternalOpen] = useState(false)  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  const formattedValue = (value?.from || value?.to) ? `${getValue(value?.from)} - ${getValue(value?.to)}` : ''

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex gap-2">
            <Input
              id="date"
              value={formattedValue}
              placeholder={'Choose date'}
              className={cn(
                "rounded-full h-10 px-3 border-brown cursor-pointer",
                isError && "!border-red-500 focus:border-red-500 !ring-red-500/20 focus:ring-red-500"
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
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 pointer-events-none"
            >
              <BsCalendar2 className={cn("size-4 text-brown", isError && "text-red-500")} />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={cn(className, "overflow-hidden  rounded-[20px] bg-white p-2 flex flex-col w-[350px] md:w-[660px]")}
          align="center"
          side="top"
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
