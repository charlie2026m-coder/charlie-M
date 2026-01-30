'use client'
import { useParams } from 'next/navigation'
import PaymentForm from './components/PaymentForm'
import ServicesTable from './components/ServicesTable'
import { useAddExtrasStore } from '@/store/useAddExtras'
import PaymentBanner from '@/app/_components/ui/PaymentBanner'

const PaymentPage = () => {
  const params = useParams()
  const reservationId = params.id as string
  const selectedServices = useAddExtrasStore(state => state.services)
  const nights = useAddExtrasStore(state => state.nights)
  const availableExtras = useAddExtrasStore(state => state.availableExtras)

  if (selectedServices.length === 0) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold mb-2'>No services selected</h2>
          <p className='text-gray-600'>Please go back and select services to pay for.</p>
        </div>
      </div>
    )
  }

  // Calculate total amount from selected services
  const totalAmount = Math.round(selectedServices.reduce((total, service) => {
    const serviceDetails = availableExtras.find(s => s.id === service.serviceId)
    const isBabyBed = service.serviceId === 'CMH-BAB'
    
    if (isBabyBed && serviceDetails) {
      return total + (serviceDetails.price * nights)
    }
    if (service.count !== undefined && service.price !== undefined) {
      if (serviceDetails) {
        const isDaily = serviceDetails.pricingType === 'Daily'
        const isPerson = serviceDetails.pricingUnit === 'Person'
        const isRoom = serviceDetails.pricingUnit === 'Room'
        
        if (isDaily && (isPerson || isRoom)) {
          return total + (service.count * service.price * nights)
        }
      }
      return total + (service.count * service.price)
    }
    if (service.dates) {
      return total + service.dates.reduce((sum, date) => sum + (date.amount?.amount || 0), 0)
    }
    return total
  }, 0) * 100) / 100

  return (
    <div className='flex flex-col flex-1 p-3 lg:p-[30px]'>
      <PaymentBanner />
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-10 pb-[30px] pt-16`}>
        <div className='lg:col-span-2'>
          <PaymentForm 
            amount={totalAmount} 
            reservationId={reservationId}
          />
        </div>
        <div className='lg:col-span-1'>
          <ServicesTable />
        </div>
      </div>
    </div>
  )
}

export default PaymentPage