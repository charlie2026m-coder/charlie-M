'use client'
import { useState, useEffect } from 'react'
import { Calendar } from '@/app/_components/ui/calendar'
import { DateRange } from 'react-day-picker'
import ExistingExtras from './ExistingExtras'
import dayjs from 'dayjs'
import { useParams } from 'next/navigation'

const ExtandYourStay = ({ 
  existingServices, 
  nights,
  arrival,
  departure,
  availableExtras
}: { 
  existingServices?: any[], 
  nights: number,
  arrival: string,
  departure: string,
  availableExtras: any[]
}) => {
  const params = useParams()
  const reservationId = params.id as string
  const arrivalDate = new Date(arrival)
  
  // Day after departure is the start of extension
  const extensionStartDate = dayjs(departure).add(1, 'day').toDate()
  
  // Load extension dates from localStorage if available
  const [extensionRange, setExtensionRange] = useState<DateRange | undefined>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`extension-${reservationId}`)
      if (stored) {
        try {
          const { from, to } = JSON.parse(stored)
          if (from && to) {
            return {
              from: new Date(from),
              to: new Date(to)
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
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

  // Get all dates in the existing reservation range
  const getReservationDates = () => {
    const dates: Date[] = []
    let currentDate = dayjs(arrival)
    const endDate = dayjs(departure)
    
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      dates.push(currentDate.toDate())
      currentDate = currentDate.add(1, 'day')
    }
    
    return dates
  }

  const reservationDates = getReservationDates()

  return (
    <div className='mb-10'>
      <div className='flex items-center gap-2 pb-2 mb-5 text-lg font-semibold w-full'>
        Extend your stay
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Left side - Calendar (2/3 width) */}
        <div className='col-span-1 '>
          <div className='rounded-lg border p-5 bg-white'>
            <style jsx global>{`
              /* Existing reservation dates - #D3C393 and disabled */
              button.reservation-date,
              button.reservation-date:disabled,
              .rdp-day.reservation-date button,
              .rdp-day.reservation-date button:disabled {
                background-color: #D3C393 !important;
                color: white !important;
                opacity: 1 !important;
                pointer-events: none !important;
                cursor: not-allowed !important;
              }
              
              /* Extension dates - golden color #A09060 */
              button[data-range-start=true]:not(.reservation-date),
              button[data-range-end=true]:not(.reservation-date),
              button[data-range-middle=true]:not(.reservation-date) {
                background-color: #A09060 !important;
                color: white !important;
              }
            `}</style>
            <Calendar 
              mode="range"
              captionLayout="label"
              selected={extensionRange}
              defaultMonth={arrivalDate}
              onSelect={(date) => {
                // Only allow selecting dates after departure
                if (date?.from && dayjs(date.from).isBefore(extensionStartDate, 'day')) {
                  return; // Don't allow selection before extension start
                }
                
                // Allow single day selection (one night)
                setExtensionRange(date as DateRange);
              }}
              disabled={[
                { before: extensionStartDate }, // Disable all dates before extension start
                ...reservationDates // Disable all reservation dates
              ]}
              modifiers={{
                reservation: reservationDates
              }}
              modifiersClassNames={{
                reservation: 'reservation-date'
              }}
              className='mx-auto'
            />
          </div>
        </div>

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