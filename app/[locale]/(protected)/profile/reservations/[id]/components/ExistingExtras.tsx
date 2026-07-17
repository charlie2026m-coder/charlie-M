'use client'
import { useAddExtrasStore } from '@/store/useAddExtras'
import { Service } from '@/types/apaleo'
import { Button } from '@/app/_components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FiTrash2 } from 'react-icons/fi'
import { isBabyBedService, isCleaningService } from '@/lib/extrasPrice'
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
  const removeService = useAddExtrasStore(state => state.removeService)

  // ONE derivation for both the rendered rows and the total — these used to be
  // two independent copies of the pricing rules and every rule change (the
  // baby-bed one-time flip) had to be hand-applied to both in lockstep.
  type SummaryRow = {
    serviceId: string
    name: string
    quantityText: string
    price: number
  }
  const newServiceRows: SummaryRow[] = selectedServices.flatMap(selectedService => {
    const serviceDetails = availableExtras.find(s => s.id === selectedService.serviceId)
    if (!serviceDetails) return []

    if (isBabyBedService(selectedService.serviceId)) {
      // One-time fee for the whole stay (matches the booking flow + validator).
      return [{ serviceId: selectedService.serviceId, name: serviceDetails.name, quantityText: '1', price: serviceDetails.price }]
    }

    if (selectedService.count !== undefined && selectedService.price !== undefined) {
      const isDaily = serviceDetails.pricingType === 'Daily'
      const isPerson = serviceDetails.pricingUnit === 'Person'
      const isRoom = serviceDetails.pricingUnit === 'Room'
      const multiplied = isDaily && (isPerson || isRoom)
      const price = Math.round(selectedService.price * selectedService.count * (multiplied ? nights : 1) * 100) / 100
      const quantityText = multiplied && isPerson
        ? `${selectedService.count} × ${nights} ${t('nights')}`
        : `${selectedService.count}`
      return [{ serviceId: selectedService.serviceId, name: serviceDetails.name, quantityText, price }]
    }

    if (selectedService.dates) {
      const eligible = isCleaningService(selectedService.serviceId, serviceDetails.name)
        ? selectedService.dates.filter((d: any) => d.isExisting === false)
        : selectedService.dates
      const totalCount = isCleaningService(selectedService.serviceId, serviceDetails.name)
        ? eligible.length
        : eligible.reduce((sum, d) => sum + (d.count || 1), 0)
      if (totalCount === 0) return []
      const price = Math.round(eligible.reduce((sum: number, d: any) => sum + (d.amount?.amount || 0), 0) * 100) / 100
      return [{ serviceId: selectedService.serviceId, name: serviceDetails.name, quantityText: `${totalCount}`, price }]
    }

    return []
  })

  const newServicesTotal = Math.round(newServiceRows.reduce((sum, r) => sum + r.price, 0) * 100) / 100
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
        
        {/* New selected services — rendered from the same rows the total sums */}
        {newServiceRows.map((row, index) => (
          <div key={`new-${row.serviceId}-${index}`} className='flex justify-between items-center gap-2 w-full text-sm text-green'>
            <span className='min-w-0 truncate'>
              + {row.name} ({row.quantityText})
            </span>
            <span className='flex items-center gap-1 shrink-0'>
              <span className='font-semibold'>€{row.price.toFixed(2)}</span>
              {/* Selected-but-unpaid → removable right from the summary. */}
              <button
                type='button'
                aria-label={`Remove ${row.name}`}
                onClick={() => removeService(row.serviceId)}
                className='grid place-items-center size-7 rounded-lg text-dark/45 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer'
              >
                <FiTrash2 className='size-4' />
              </button>
            </span>
          </div>
        ))}
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
