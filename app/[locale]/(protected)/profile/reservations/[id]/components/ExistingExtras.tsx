'use client'
import { useAddExtrasStore } from '@/store/useAddExtras'
import { Service } from '@/types/apaleo'
import { Button } from '@/app/_components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
const ExistingExtras = ({ 
  services, 
  nights,
  availableExtras
}: { 
  services: any[], 
  nights: number,
  availableExtras: Service[]
}) => {
  const t = useTranslations('profile')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as 'en' | 'de'
  const reservationId = params.id as string
  const selectedServices = useAddExtrasStore(state => state.services)
  const setNights = useAddExtrasStore(state => state.setNights)
  
  const calculateNewServiceTotal = () => {
    let total = 0
    
    selectedServices.forEach(selectedService => {
      const serviceDetails = availableExtras.find(s => s.id === selectedService.serviceId)
      const isBabyBed = selectedService.serviceId === 'CMH-BAB'
      
      if (isBabyBed && serviceDetails) {
        // One-time fee for the whole stay (matches the booking flow).
        total += serviceDetails.price
      } else if (selectedService.count !== undefined && selectedService.price !== undefined) {
        if (serviceDetails) {
          const isDaily = serviceDetails.pricingType === 'Daily'
          const isPerson = serviceDetails.pricingUnit === 'Person'
          const isRoom = serviceDetails.pricingUnit === 'Room'
          
          if (isDaily && (isPerson || isRoom)) {
            total += selectedService.price * selectedService.count * nights
          } else {
            total += selectedService.price * selectedService.count
          }
        }
      } else if (selectedService.dates) {
        const isCleaning = selectedService.serviceId === 'CMH-CLN' || serviceDetails?.name?.toLowerCase().includes('clean')
        
        if (isCleaning) {
          // For cleaning: sum only new dates (isExisting: false)
          selectedService.dates.forEach((dateItem: any) => {
            if (dateItem.isExisting === false) {
              total += dateItem.amount?.amount || 0
            }
          })
        } else {
          // For other services with dates
          selectedService.dates.forEach(dateItem => {
            total += dateItem.amount?.amount || 0
          })
        }
      }
    })
    
    return Math.round(total * 100) / 100
  }
  
  const newServicesTotal = calculateNewServiceTotal()
  const hasNewServices = selectedServices.length > 0
  const hasExistingServices = services && services.length > 0

  if (!hasExistingServices && !hasNewServices) {
    return null
  }

  return (
    <div className='rounded-lg p-5 border h-full flex flex-col'>
      <h2 className='mt-2 font-semibold mb-4'>{t('extraServices')}:</h2>
      <div className='flex flex-col gap-3 flex-1'>
        {/* Existing services */}
        {hasExistingServices && services.map((serviceItem: any, index: number) => {
          const { service, totalAmount, dates } = serviceItem
          const isCleaning = service.id === 'CMH-CLN' || service.name?.toLowerCase().includes('clean')
          const isBabyBed = service.id === 'CMH-BAB'
          const isCheckout = service.id === 'CMH-LCO' || service.id === 'CMH-ECI'
          const mode = service.availability?.mode
          
          let quantity = 1
          
          // Services with dates array (Cleaning, Baby Bed, etc.)
          if ((isCleaning || isBabyBed) && dates && Array.isArray(dates)) {
            // Count number of days (dates where count > 0)
            quantity = dates.filter((d: any) => (d.count || 0) > 0).length
          } 
          // One-time services (Early Check-in, Late Checkout)
          else if (isCheckout || mode === 'Arrival' || mode === 'Departure') {
            quantity = 1
          }
          // Daily services with Room pricing (Parking, Pet, etc.)
          else if (service.pricingUnit === 'Room' && mode === 'Daily') {
            quantity = nights
          }
          // Person pricing (Breakfast, etc.)
          else if (service.pricingUnit === 'Person') {
            quantity = 1
          }

          const serviceName = service.name;
          
          return (
            <div key={`existing-${service.id}-${index}`} className='flex justify-between items-center w-full text-sm'>
              <span className='text-dark'>
                {serviceName} ({quantity})
              </span>
              <span className='font-semibold'>€{totalAmount.grossAmount}</span>
            </div>
          )
        })}
        </div>

      {hasNewServices && <div className='flex flex-col gap-3 mt-5'>
        
        {/* New selected services */}
        {hasNewServices && selectedServices.map((selectedService, index) => {
          const serviceDetails = availableExtras.find(s => s.id === selectedService.serviceId)
          if (!serviceDetails) return null
          
          let price = 0
          let quantityText = ''
          let shouldDisplay = true
          
          const isBabyBed = selectedService.serviceId === 'CMH-BAB'
          
          if (isBabyBed) {
            // One-time fee for the whole stay.
            price = serviceDetails.price
            quantityText = '1'
          } else if (selectedService.count !== undefined && selectedService.price !== undefined) {
            const isPerson = serviceDetails.pricingUnit === 'Person'
            const isRoom = serviceDetails.pricingUnit === 'Room'
            const isDaily = serviceDetails.pricingType === 'Daily'
            
            if (isDaily && (isPerson || isRoom)) {
              price = Math.round(selectedService.price * selectedService.count * nights * 100) / 100
              if (isPerson) {
                quantityText = `${selectedService.count} × ${nights} ${t('nights')}`
              } else {
                quantityText = `${selectedService.count}`
              }
            } else {
              price = Math.round(selectedService.price * selectedService.count * 100) / 100
              quantityText = `${selectedService.count}`
            }
          } else if (selectedService.dates) {
            const isCleaning = selectedService.serviceId === 'CMH-CLN' || serviceDetails?.name?.toLowerCase().includes('clean')
            
            if (isCleaning) {
              // For cleaning: count only new dates (isExisting: false)
              const newDates = selectedService.dates.filter((d: any) => d.isExisting === false)
              const totalCount = newDates.length
              
              // Don't display if no new dates
              if (totalCount === 0) {
                shouldDisplay = false
              } else {
                price = Math.round(newDates.reduce((sum: number, d: any) => sum + (d.amount?.amount || 0), 0) * 100) / 100
                quantityText = `${totalCount}`
              }
            } else {
              // For other services with dates
              const totalCount = selectedService.dates.reduce((sum, d) => sum + (d.count || 1), 0)
              price = Math.round(selectedService.dates.reduce((sum, d) => sum + (d.amount?.amount || 0), 0) * 100) / 100
              quantityText = `${totalCount}`
            }
          }

          if (!shouldDisplay) return null

          const serviceName = serviceDetails.name;

          return (
            <div key={`new-${selectedService.serviceId}-${index}`} className='flex justify-between items-center w-full text-sm text-green'>
              <span>
                + {serviceName} ({quantityText})
              </span>
              <span className='font-semibold'>€{price.toFixed(2)}</span>
            </div>
          )
        })}
        <div className='flex justify-between items-center my-2 text-sm font-semibold'>
          <span>{t('total')}</span>
          <span className='text-green'>€{newServicesTotal.toFixed(2)}</span>
        </div>
      </div>}
      
      {/* Pay Now button */}
      {hasNewServices && (
        <div className='mt-5 '>
          <Button 
            className='w-full h-[45px]' 
            variant='outline'
            onClick={() => {
              setNights(nights)
              router.push(`/profile/reservations/${reservationId}/payment`)
            }}
          >
            {t('payNow')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ExistingExtras
