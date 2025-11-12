"use client"

import { Input } from "./input"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { BsCalendar2 } from "react-icons/bs";
import { useState } from "react";
import dayjs from 'dayjs';

const getValue = (date: Date | undefined) => {
  if (!date) return ''
  return dayjs(date).format('DD MMM YYYY')
}

export function DateInput({
  children,
  value,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  children?: React.ReactNode,
  value?: Date | undefined,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex gap-2">
            <Input
              id="date"
              value={getValue(value)}
              placeholder={'Choose date'}
              className="rounded-full h-10 px-3 border-brown cursor-pointer"
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
              <BsCalendar2 className="size-4 text-brown" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="overflow-hidden w-[350px] rounded-[20px] bg-white p-2"
          align="center"
          side="bottom"
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
