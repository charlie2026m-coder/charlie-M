"use client"

import * as React from "react"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Button } from "./button"
import { Input } from "./input"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Separator } from "./separator"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

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

export function Guests({ 
  maxAdults = 99,
  maxChildren = 99,
  maxPersons,
  setValue, 
  value,
  className = ''
}: { 
  maxAdults?: number,
  maxChildren?: number,
  maxPersons?: number,
  setValue: (value: { adults: number, children: number }) => void, 
  value: { adults: number, children: number },
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const t = useTranslations()

  const guestsText = `${value.adults + value.children} Guest${value.adults + value.children !== 1 ? 's' : ''}`
  
  // Вычисляем реальные лимиты с учетом maxPersons
  const totalGuests = value.adults + value.children;
  const canAddAdult = maxPersons ? totalGuests < maxPersons && value.adults < maxAdults : value.adults < maxAdults;
  const canAddChild = maxPersons ? totalGuests < maxPersons && value.children < maxChildren : value.children < maxChildren;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex gap-2">
          <Input
            value={guestsText}
            placeholder="Guests"
            className={cn("rounded-full h-10 px-3 pr-10 border-brown cursor-pointer", className)}
            readOnly
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none">
            {open ? <ChevronUp className="size-4 text-brown" />: <ChevronDown className="size-4 text-brown" />}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className={cn("rounded-[20px] bg-white p-4 min-w-[260px]")}
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
            <div className="font-semibold text-black">{t('guests.adults')}</div>

            <div className="flex items-center gap-2">
              <ButtonIcon onClick={() => setValue({ ...value, adults: Math.max(1, value.adults - 1) })} symbol='-' disabled={value.adults <= 1} />
              <span className="font-semibold min-w-[20px] text-center">
                {value.adults}
              </span>

              <ButtonIcon 
                onClick={() => setValue({ ...value, adults: value.adults + 1 })} 
                symbol='+' 
                disabled={!canAddAdult}
              />
            </div>
          </div>

          <Separator/>

          {/* Children */}
          <div className="flex flex-col ">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-black">{t('guests.children')}</div>

              <div className="flex items-center gap-2">
                <ButtonIcon onClick={() => setValue({ ...value, children: Math.max(0, value.children - 1) })} disabled={value.children <= 0} symbol='-' />
                <span className="font-semibold min-w-[20px] text-center">
                  {value.children}
                </span>
                <ButtonIcon 
                  onClick={() => setValue({ ...value, children: value.children + 1 })} 
                  symbol='+' 
                  disabled={!canAddChild}
                />
              </div>
            </div>
            
            <div className="text-black/30 text-[12px]">{t('guests.children_age_note')}</div>
            
            {value.children > 0 && (
              <div className="text-blue text-[12px] mt-1 font-medium">
                {t('guests.crib_fee_note')}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}



