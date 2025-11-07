"use client"

import * as React from "react"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { Input } from "./input"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Separator } from "./separator"

const ButtonIcon = ({ onClick, symbol, disabled }: { onClick: () => void, symbol: '+' | '-', disabled?: boolean }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      className='size-6 rounded-full bg-blue hover:opacity-60 disabled:opacity-50 pb-[2px] hover:bg-blue hover:text-white text-white'
      onClick={() => onClick()}
    > {symbol} </Button>
  )
}

export function Guests() {
  const [open, setOpen] = React.useState(false)
  const [adults, setAdults] = React.useState(1)
  const [children, setChildren] = React.useState(0)

  const totalGuests = adults + children
  const guestsText = `${totalGuests} Guest${totalGuests !== 1 ? 's' : ''}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex gap-2">
          <Input
            value={guestsText}
            placeholder="Guests"
            className="rounded-full h-10 px-3 pr-10 border-brown cursor-pointer"
            readOnly
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none">
            {open ? <ChevronUp className="size-4 text-brown" />: <ChevronDown className="size-4 text-brown" />}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="rounded-[20px] bg-white p-4"
        align="center"
        side="bottom"
        sideOffset={10}
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-slot="popover-content"]')) {
            e.preventDefault()
          }}}
      >
        <div className="flex flex-col gap-4">
          {/* Adults */}
          <div className="flex items-center justify-between ">
            <div className="font-semibold text-black">Adults</div>

            <div className="flex items-center gap-2">
              <ButtonIcon onClick={() => setAdults(Math.max(1, adults - 1))} symbol='-' disabled={adults <= 1} />
              <span className="font-semibold min-w-[20px] text-center">
                {adults}
              </span>

              <ButtonIcon onClick={() => setAdults(adults + 1)} symbol='+' />
            </div>
          </div>

          <Separator/>

          {/* Children */}
          <div className="flex flex-col ">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-black">Children</div>

              <div className="flex items-center gap-2">
                <ButtonIcon onClick={() => setChildren(Math.max(0, children - 1))} disabled={children <= 0} symbol='-' />
                <span className="font-semibold min-w-[20px] text-center">
                  {children}
                </span>
                <ButtonIcon onClick={() => setChildren(children + 1)} symbol='+' />
              </div>
            </div>
            
            <div className="text-black/30 text-[12px]">from 0 to 8 years</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}



