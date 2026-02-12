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
  maxChildren = 5,
  maxPersons,
  maxBabyBeds,
  setValue, 
  value,
  className = '',
  disableChildren = false,
  totalChildrenInAllRooms,
  maxChildrenPerRoom
}: { 
  maxAdults?: number,
  maxChildren?: number,
  maxPersons?: number,
  maxBabyBeds?: number,
  setValue: (value: { adults: number, children: number }) => void, 
  value: { adults: number, children: number },
  className?: string,
  disableChildren?: boolean,
  totalChildrenInAllRooms?: number,
  maxChildrenPerRoom?: number
}) {
  const [open, setOpen] = React.useState(false)
  const t = useTranslations()

  const guestsText = value.adults === 1 
    ? `1 ${t('guests.guest')}`
    : `${value.adults} ${t('guests.guests')}`
  const canAddAdult = maxPersons ? value.adults < maxPersons && value.adults < maxAdults : value.adults < maxAdults;
  
  // Children cannot exceed adults, and maximum 5 children
  const maxChildrenAllowed = value.adults; // Children not more than adults
  const maxChildrenLimit = 5; // Maximum 5 children
  
  // Calculate available baby beds considering children in all rooms
  let availableBabyBedsForThisRoom = maxBabyBeds;
  if (maxBabyBeds !== undefined && totalChildrenInAllRooms !== undefined) {
    // Children in other rooms (excluding current room)
    const childrenInOtherRooms = totalChildrenInAllRooms - value.children;
    // Available baby beds for this room = total - children in other rooms
    availableBabyBedsForThisRoom = Math.max(0, maxBabyBeds - childrenInOtherRooms);
  }
  
  // Limit children by available baby beds if provided, and apply max limits
  // If maxChildrenPerRoom is set (e.g., 1 for booking page), use it as hard limit
  let effectiveMaxChildren = availableBabyBedsForThisRoom !== undefined 
    ? Math.min(maxChildren, maxChildrenAllowed, maxChildrenLimit, availableBabyBedsForThisRoom)
    : Math.min(maxChildren, maxChildrenAllowed, maxChildrenLimit);
  
  // Apply per-room limit if specified (for booking page: only 1 child per room)
  if (maxChildrenPerRoom !== undefined) {
    effectiveMaxChildren = Math.min(effectiveMaxChildren, maxChildrenPerRoom);
  }
    
  const canAddChild = value.children < effectiveMaxChildren;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex gap-2" suppressHydrationWarning>
          <div className='hidden md:flex gap-2 text-xs absolute -top-2 left-5 bg-white px-1 z-10'>
            {t('guests.label')}
          </div>
          <div className="relative w-full">
            <Input
              value={guestsText}
              placeholder={t('guests.label')}
              className={cn("rounded-full h-10 px-3 pr-4 md:pr-10 border-white shadow-none text-sm md:text-base md:border-black cursor-pointer", className)}
              readOnly
            />
            {value.children > 0 && (
              <div className="absolute -top-2 right-1 bg-pink-400 rounded-full px-1  flex items-center justify-center text-white text-[8px] md:text-[9px] font-semibold pointer-events-none whitespace-nowrap">
                {value.children === 1 
                  ? `1 ${t('guests.baby')}` 
                  : `${value.children} ${t('guests.babies')}`}
              </div>
            )}
          </div>
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
              <ButtonIcon 
                onClick={() => {
                  const newAdults = Math.max(1, value.adults - 1);
                  // If children exceed new adults count, reduce children to match adults
                  const newChildren = Math.min(value.children, newAdults);
                  setValue({ adults: newAdults, children: newChildren });
                }} 
                symbol='-' 
                disabled={value.adults <= 1} 
              />
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



