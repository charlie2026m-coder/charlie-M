'use client'
import { useState, useEffect } from 'react'
import { Calendar } from '@/app/_components/ui/calendar'
import { DateRange } from 'react-day-picker'
import ExistingExtras from './ExistingExtras'
import dayjs from 'dayjs'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/app/_components/ui/button'
import { useExtensionRooms } from '@/app/hooks/useExtensionRooms'
import { useTranslations } from 'next-intl'
import { useAddExtrasStore } from '@/store/useAddExtras'
import { useBookingStore } from '@/store/useBookingStore'
import { cn } from '@/lib/utils'
import { Guest } from '@/types/apaleo'

const ExtandYourStay = ({ 
  existingServices, 
  nights,
  arrival,
  departure,
  availableExtras,
  unitGroupId,
  adults,
  booker,
  primaryGuest
}: { 
  existingServices?: any[], 
  nights: number,
  arrival: string,
  departure: string,
  availableExtras: any[],
  unitGroupId?: string,
  adults?: number,
  children?: number,
  booker?: Guest,
  primaryGuest?: Guest
}) => {
  const t = useTranslations('reservations')
  const params = useParams()
  const reservationId = params.id as string
  const arrivalDate = new Date(arrival)
  const router = useRouter()
  const { openExtendYourStay, services  } = useAddExtrasStore();
  const setBooking = useBookingStore(state => state.setBooking)
  const setIsExtend = useBookingStore(state => state.setIsExtend)
  const [isNavigating, setIsNavigating] = useState(false)
  // Day after departure is the start of extension
  // Load extension dates from localStorage if available
  const [extensionRange, setExtensionRange] = useState<DateRange | undefined>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`extension-${reservationId}`)
      if (stored) {
        try {
          const { from, to } = JSON.parse(stored)
          if (from && to) return { from: new Date(from), to: new Date(to)}
        } catch (e) {}
      }
    }
    return undefined
  })
  
  // Save extension dates to localStorage when changed
  useEffect(() => {
    if (extensionRange?.from && extensionRange?.to) {
      localStorage.setItem(`extension-${reservationId}`, JSON.stringify({
        from: extensionRange.from.toISOString(),
        to: extensionRange.to.toISOString()
      }))
    }
  }, [extensionRange, reservationId])
  
  // Calculate extension nights
  const extensionNights = extensionRange?.from && extensionRange?.to 
    ? dayjs(extensionRange.to).startOf('day').diff(dayjs(extensionRange.from).startOf('day'), 'day')
    : 0

  // Fetch rooms for extension dates
  const [availableUnits, setAvailableUnits] = useState<number | null>(null)
  const [babyBedAvailable, setBabyBedAvailable] = useState<boolean | null>(null)
  const { mutate: fetchExtensionRooms, isPending: isLoadingRooms } = useExtensionRooms()

  // Reset availableUnits when dates change
  useEffect(() => {
    setAvailableUnits(null)
    setBabyBedAvailable(null)
  }, [extensionRange])

  // Get all dates in the existing reservation range (excluding departure date for disabled)
  const getReservationDates = () => {
    const dates: Date[] = []
    let currentDate = dayjs(arrival)
    const endDate = dayjs(departure)
    
    // Include all dates from arrival to the day before departure
    while (currentDate.isBefore(endDate, 'day')) {
      dates.push(currentDate.toDate())
      currentDate = currentDate.add(1, 'day')
    }
    
    return dates
  }

  // Get all dates including departure for styling
  const getAllReservationDates = () => {
    const dates: Date[] = []
    let currentDate = dayjs(arrival)
    const endDate = dayjs(departure)
    
    // Include all dates from arrival to departure (inclusive)
    while (currentDate.isBefore(endDate, 'day') || currentDate.isSame(endDate, 'day')) {
      dates.push(currentDate.toDate())
      currentDate = currentDate.add(1, 'day')
    }
    
    return dates
  }

  const reservationDates = getReservationDates()
  const allReservationDates = getAllReservationDates()
  const departureDate = dayjs(departure).toDate()

  // Check if baby bed service exists in existing services
  const isBaby = existingServices?.some(service => 
    service.service.id === 'CMH-BAB' || service.service.name?.toLowerCase().includes('baby')
  ) || false

  return (
    <div className={cn(
      'mb-10', 
      (openExtendYourStay || (services && services.length > 0) || (existingServices && existingServices.length > 0)) 
      ? 'block' 
      : 'hidden')}>
      <div className='flex items-center gap-2 pb-2 mb-5 text-lg font-semibold w-full'>
        {t('extendYourStay.title')}
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Left side - Calendar (2/3 width) */}
        {openExtendYourStay && (
          <div className='col-span-1 '>
          <div className='rounded-lg border p-5 bg-white'>
            <style jsx global>{`
              /* All reservation dates including departure - #D3C393 styling */
              button.all-reservation-date,
              .rdp-day.all-reservation-date button {
                background-color: #D3C393 !important;
                color: white !important;
                opacity: 1 !important;
              }
              
              /* Disabled reservation dates (not including departure) */
              button.reservation-date,
              button.reservation-date:disabled,
              .rdp-day.reservation-date button,
              .rdp-day.reservation-date button:disabled {
                pointer-events: none !important;
                cursor: not-allowed !important;
              }
              
              /* Extension dates - golden color #A09060 */
              button[data-range-start=true]:not(.all-reservation-date),
              button[data-range-end=true]:not(.all-reservation-date),
              button[data-range-middle=true]:not(.all-reservation-date) {
                background-color: #A09060 !important;
                color: white !important;
              }
            `}</style>
            <Calendar
              mode="range"
              captionLayout="label"
              showOutsideDays={false}
              fixedWeeks={false}
              selected={extensionRange}
              defaultMonth={arrivalDate}
              onSelect={(date) => {
                // Don't allow selection before departure date
                if (date?.from && dayjs(date.from).isBefore(departureDate, 'day')) {
                  return;
                }
                
                // Auto-select next day when only from is selected
                if (date?.from && !date?.to) {
                  const nextDay = new Date(date.from);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setExtensionRange({ from: date.from, to: nextDay });
                } else if (date?.from && date?.to) {
                  // Check if same day selected
                  if (date.from.getTime() === date.to.getTime()) {
                    const nextDay = new Date(date.from);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setExtensionRange({ from: date.from, to: nextDay });
                  } else {
                    setExtensionRange(date as DateRange);
                  }
                } else {
                  setExtensionRange(date as DateRange);
                }
              }}
              disabled={[
                { before: departureDate }, // Disable all dates before departure
                ...reservationDates // Disable all reservation dates (arrival to day before departure)
              ]}
              modifiers={{
                reservation: reservationDates,
                allReservation: allReservationDates
              }}
              modifiersClassNames={{
                reservation: 'reservation-date',
                allReservation: 'all-reservation-date'
              }}
              className='mx-auto'
            />
            
            {/* Extension confirmation section */}
            {extensionRange?.from && extensionRange?.to && extensionNights > 0 && (
              <div className='flex flex-col pt-4 '>
                {availableUnits !== null ? (
                  <>
                  <p className='mt-5 mb-4'>
                    {t('extendYourStay.availableRoomsPrefix')} <strong>{availableUnits}</strong> {availableUnits === 1 ? t('extendYourStay.room') : t('extendYourStay.rooms')} {t('extendYourStay.availableRoomsSuffix')}
                  </p>
                    {isBaby && babyBedAvailable === false && (
                      <p className='mb-4 text-red-600 text-sm'>
                        Baby bed is not available for the selected dates.
                      </p>
                    )}
                  </>
                ) : (
                  <p className='mt-5 mb-4'>
                    {t('extendYourStay.nightsPrefix')} <strong>{extensionNights}</strong> {t('extendYourStay.nightsSuffix')}
                  </p>
                )}
                
                <div className='flex gap-3'>
                  <Button 
                    className='flex-1 h-[45px]' 
                    variant='outline'
                    onClick={() => {
                      setExtensionRange(undefined)
                      setAvailableUnits(null)
                      localStorage.removeItem(`extension-${reservationId}`)
                    }}
                  >
                    {t('extendYourStay.cancel')}
                  </Button>
                  {availableUnits !== null ? (
                    <Button 
                      className='flex-1 h-[45px]' 
                      variant='default'
                      disabled={isNavigating || availableUnits === 0}
                      onClick={() => {
                        if (extensionRange?.from && extensionRange?.to && unitGroupId) {
                          setIsNavigating(true)
                          const fromDate = dayjs(extensionRange.from).format('YYYY-MM-DD')
                          const toDate = dayjs(extensionRange.to).format('YYYY-MM-DD')
                          const queryParams = new URLSearchParams({
                            from: fromDate,
                            to: toDate,
                            adults: (adults || 1).toString(),
                            children: isBaby ? '1' : '0'
                          })
                          
                          const bookerData = primaryGuest || booker
                          if (bookerData) {
                            setBooking({
                              booker: bookerData,
                              reservations: []
                            })
                          }
                          setIsExtend(true)
                          router.push(`/booking/${unitGroupId}?${queryParams.toString()}`)
                        }
                      }}
                    >
                      {isNavigating ? t('extendYourStay.loading') : t('extendYourStay.book')}
                    </Button>
                  ) : (
                    <Button 
                      className='flex-1 h-[45px]' 
                      variant='default'
                      disabled={isLoadingRooms || !unitGroupId}
                      onClick={() => {
                        if (extensionRange?.from && extensionRange?.to && unitGroupId) {
                          fetchExtensionRooms(
                            {
                              from: extensionRange.from,
                              to: extensionRange.to,
                              roomId: unitGroupId,
                              isBaby: isBaby
                            },
                            {
                              onSuccess: (data) => {
                                // data is always an object with availableUnits (number) and babyBedAvailable (boolean | undefined)
                                setAvailableUnits(data.availableUnits)
                                setBabyBedAvailable(data.babyBedAvailable ?? null)
                              }
                            }
                          )
                        }
                      }}
                    >
                      {isLoadingRooms ? t('extendYourStay.loading') : t('extendYourStay.check')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>)}

        {/* Right side - Existing extras card (1/3 width) */}
        <div className='col-span-1 '>
          <ExistingExtras 
            services={existingServices || []} 
            nights={nights}
            availableExtras={availableExtras}
          />
        </div>
      </div>
    </div>
  )
}

export default ExtandYourStay