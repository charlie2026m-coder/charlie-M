"use client"
import { Input } from "./input"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { BsCalendar2 } from "react-icons/bs";
import { useState } from "react";

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function DateInput() {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(
    new Date("2025-06-01")
  )
  const [month, setMonth] = useState<Date | undefined>(date)
  const [value, setValue] = useState(formatDate(date))
  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex gap-2">
            <Input
              id="date"
              value={value}
              placeholder="Choose date"
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
            // Закрываем только при клике вне календаря И триггера
            if (target.closest('input[id="date"]') || target.closest('[data-slot="popover-content"]')) {
              e.preventDefault()
            }
          }}
        >
          <Calendar
            mode="single"
            selected={date}
            captionLayout="label"
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              setDate(date)
              setValue(formatDate(date))
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}