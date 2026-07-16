'use client'
import { useAddExtrasStore } from '@/store/useAddExtras'
import Price from '@/app/_components/ui/price'
import { useTranslations, useLocale } from 'next-intl'
import { isBreakfastBeverage, isBreakfastFood, breakfastBundleLabel } from '@/lib/breakfastBundle'

const ServicesTable = () => {
  const t = useTranslations('payment')
  const locale = useLocale()
  const selectedServices = useAddExtrasStore(state => state.services)
  const nights = useAddExtrasStore(state => state.nights)
  const availableExtras = useAddExtrasStore(state => state.availableExtras)
  
  if (selectedServices.length === 0) {
    return null
  }

  const calculateTotal = () => {
    let total = 0
    selectedServices.forEach(service => {
      const serviceDetails = availableExtras.find(s => s.id === service.serviceId)
      const isBabyBed = service.serviceId === 'CMH-BAB'
      const isCleaning = service.serviceId === 'CMH-CLN' || serviceDetails?.name?.toLowerCase().includes('clean')
      
      if (isBabyBed && serviceDetails) {
        total += serviceDetails.price * nights
      } else if (service.count !== undefined && service.price !== undefined) {
        if (serviceDetails) {
          const isDaily = serviceDetails.pricingType === 'Daily'
          const isPerson = serviceDetails.pricingUnit === 'Person'
          const isRoom = serviceDetails.pricingUnit === 'Room'
          
          if (isDaily && (isPerson || isRoom)) {
            total += service.count * service.price * nights
          } else {
            total += service.count * service.price
          }
        }
      } else if (service.dates) {
        if (isCleaning) {
          total += service.dates
            .filter((d: any) => d.isExisting === false)
            .reduce((sum, d) => sum + (d.amount?.amount || 0), 0)
        } else {
          total += service.dates.reduce((sum, d) => sum + (d.amount?.amount || 0), 0)
        }
      }
    })
    return Math.round(total * 100) / 100
  }

  const totalPrice = calculateTotal()

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border self-start'>
      <h2 className='text-2xl font-bold mb-3 text-center'>{t('summary')}</h2>

      <div className='flex flex-col mb-5'>
        <span className='font-semibold mb-4 text-[15px]'>{t('services')}</span>
        
        {selectedServices.map((service, index) => {
          // Beverage half is merged into the Breakfast line below — no own row.
          if (isBreakfastBeverage(service.serviceId)) return null

          let count = 0
          let servicePrice = 0
          let shouldDisplay = true

          const isBabyBed = service.serviceId === 'CMH-BAB'
          
          if (isBabyBed) {
            const serviceDetails = availableExtras.find(s => s.id === service.serviceId)
            if (serviceDetails) {
              count = 1
              servicePrice = Math.round(serviceDetails.price * nights * 100) / 100
            }
          } else if (service.count !== undefined && service.price !== undefined) {
            const serviceDetails = availableExtras.find(s => s.id === service.serviceId)
            count = service.count
            
            if (serviceDetails) {
              const isDaily = serviceDetails.pricingType === 'Daily'
              const isPerson = serviceDetails.pricingUnit === 'Person'
              const isRoom = serviceDetails.pricingUnit === 'Room'
              
              if (isDaily && (isPerson || isRoom)) {
                servicePrice = Math.round(service.count * service.price * nights * 100) / 100
              } else {
                servicePrice = Math.round(service.count * service.price * 100) / 100
              }
            } else {
              servicePrice = Math.round(service.count * service.price * 100) / 100
            }
          } else if (service.dates) {
            const serviceDetails = availableExtras.find(s => s.id === service.serviceId)
            const isCleaning = service.serviceId === 'CMH-CLN' || serviceDetails?.name?.toLowerCase().includes('clean')
            
            if (isCleaning) {
              const newDates = service.dates.filter((d: any) => d.isExisting === false)
              count = newDates.length
              
              if (count === 0) {
                shouldDisplay = false
              } else {
                servicePrice = Math.round(newDates.reduce((sum, d) => sum + (d.amount?.amount || 0), 0) * 100) / 100
              }
            } else {
              count = service.dates.reduce((sum, d) => sum + (d.count || 1), 0)
              servicePrice = Math.round(service.dates.reduce((sum, d) => sum + (d.amount?.amount || 0), 0) * 100) / 100
            }
          }
          if (!shouldDisplay) return null

          // Breakfast: fold the beverage half's price into this single line and
          // show a clean label instead of the raw service code.
          let displayLabel = `${service.serviceId} (x${count})`
          if (isBreakfastFood(service.serviceId)) {
            const beverage = selectedServices.find(s => isBreakfastBeverage(s.serviceId))
            if (beverage?.count !== undefined && beverage?.price !== undefined) {
              const bevDetails = availableExtras.find(s => s.id === beverage.serviceId)
              const bevDaily = bevDetails?.pricingType === 'Daily'
              const bevPersonRoom = bevDetails?.pricingUnit === 'Person' || bevDetails?.pricingUnit === 'Room'
              const bevPrice = bevDaily && bevPersonRoom
                ? beverage.count * beverage.price * nights
                : beverage.count * beverage.price
              servicePrice = Math.round((servicePrice + bevPrice) * 100) / 100
            }
            displayLabel = `${breakfastBundleLabel(locale)} (x${count})`
          }

          return (
            <div key={`service-${service.serviceId}-${index}`} className='flex items-center gap-2 inter text-sm text-dark mb-2'>
              <div className='truncate overflow-hidden whitespace-nowrap flex items-center'>
                {displayLabel}
              </div>
              <span className='text-bale font-semibold ml-auto'>€ {servicePrice.toFixed(2)}</span>
            </div>
          )
        })}
        
  
      </div>

      <div className='flex items-center justify-between mb-3'>
        <span className='font-semibold text-lg'>{t('total')}</span>
        <Price price={totalPrice} />
      </div>
    </div>
  )
}

export default ServicesTable
