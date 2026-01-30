'use client'
import { useAddExtrasStore } from '@/store/useAddExtras'
import Price from '@/app/_components/ui/price'

const ServicesTable = () => {
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
        total += service.dates.reduce((sum, d) => sum + (d.amount?.amount || 0), 0)
      }
    })
    return Math.round(total * 100) / 100
  }

  const totalPrice = calculateTotal()

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border self-start'>
      <h2 className='text-2xl font-bold mb-3 text-center'>Summary</h2>

      <div className='flex flex-col mb-5'>
        <span className='font-semibold mb-4 text-[15px]'>Services:</span>
        
        {selectedServices.map((service, index) => {
          let count = 0
          let servicePrice = 0
          
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
            count = service.dates.reduce((sum, d) => sum + (d.count || 1), 0)
            servicePrice = Math.round(service.dates.reduce((sum, d) => sum + (d.amount?.amount || 0), 0) * 100) / 100
          }

          return (
            <div key={`service-${service.serviceId}-${index}`} className='flex items-center gap-2 inter text-sm text-dark mb-2'>
              <div className='truncate overflow-hidden whitespace-nowrap flex items-center'>
                {service.serviceId} (x{count})
              </div>
              <span className='text-bale font-semibold ml-auto'>€ {servicePrice.toFixed(2)}</span>
            </div>
          )
        })}
        
  
      </div>

      <div className='flex items-center justify-between mb-3'>
        <span className='font-semibold text-lg'>Total:</span>
        <Price price={totalPrice} />
      </div>
    </div>
  )
}

export default ServicesTable
