"use client"

import * as React from "react"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Input } from "./input"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Separator } from "./separator"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { ButtonIcon } from "./ButtonIcon"


export function Guests({ 
  maxAdults = 99,
  maxChildren = 99,
  maxPersons,
  setValue, 
  value,
  className = '',
  disableChildren = false
}: { 
  maxAdults?: number,
  maxChildren?: number,
  maxPersons?: number,
  setValue: (value: { adults: number, children: number }) => void, 
  value: { adults: number, children: number },
  className?: string,
  disableChildren?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const t = useTranslations()

  const guestsText = value.adults === 1 
    ? `1 ${t('guests.guest')}`
    : `${value.adults} ${t('guests.guests')}`
  const canAddAdult = maxPersons ? value.adults < maxPersons && value.adults < maxAdults : value.adults < maxAdults;
  const canAddChild = value.children < maxChildren && value.children < 5 && value.children < value.adults;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex gap-2" suppressHydrationWarning>
          <div className='hidden md:flex  gap-2 text-xs absolute -top-2 left-5 bg-white px-1'>
            {t('guests.label')}
          </div>
          <Input
            value={guestsText}
            placeholder={t('guests.label')}
            className={cn("rounded-full h-10 px-3 pr-4 md:pr-10 border-white shadow-none text-sm md:text-base md:border-black  cursor-pointer", className)}
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
            <div className="font-semibold text-black">{t('guests.label')}</div>

            <div className="flex items-center gap-2">
              <ButtonIcon onClick={() => setValue({ ...value, adults: Math.max(1, value.adults - 1) })} symbol='-' disabled={value.adults <= 1} />
              <span className="font-semibold min-w-[20px] text-center">
                {value.adults}
              </span>

              <ButtonIcon   onClick={() => setValue({ ...value, adults: value.adults + 1 })} symbol='+' disabled={!canAddAdult} />
            </div>
          </div>

          <Separator/>

          {/* Children */}
          <div className={`flex flex-col ${disableChildren ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-black">{t('guests.babies')}</div>

              <div className="flex items-center gap-2">
                <ButtonIcon 
                  onClick={() => !disableChildren && setValue({ ...value, children: Math.max(0, value.children - 1) })} 
                  disabled={value.children <= 0 || disableChildren} 
                  symbol='-' 
                />
                <span className="font-semibold min-w-[20px] text-center">
                  {value.children}
                </span>
                <ButtonIcon 
                  onClick={() => !disableChildren && setValue({ ...value, children: value.children + 1 })} 
                  symbol='+' 
                  disabled={!canAddChild || disableChildren}
                />
              </div>
            </div>
            
            <div className="text-black/30 text-[12px]">
              {disableChildren ? t('guests.children_not_available') : t('guests.children_age_note')}
            </div>
            
            {value.children > 0 && !disableChildren && (
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



