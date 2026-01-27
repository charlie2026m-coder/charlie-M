'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useBookingStore } from '@/store/useBookingStore'
import { GuestDetailsFormData } from '@/types/schemas'
import Steps from '../components/Steps'
import GuestDetailsForm from './components/GuestDetailsForm'
import PaymentForm from './components/PaymentForm'
import SummaryCard from '../components/SummaryCard'

const PaymentPage = () => {
  const router = useRouter()
  const urlParams = useParams()
  const setBooking = useBookingStore(state => state.setBooking)
  const booking = useBookingStore(state => state.booking)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const handleSubmit = (data: GuestDetailsFormData) => {
    if (!booking || !booking.reservations) {
      console.error('Booking data is missing')
      return
    }

    const updatedReservations = booking.reservations.map(reservation => ({
      ...reservation,
      primaryGuest: {
        ...reservation.primaryGuest,
        firstName: data.name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
      }
    }))
    
    const bookingModel = {
      booker: {
        firstName: data.name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
      },
      consent: data.consent,
      totalAmount: booking.totalAmount,
      reservations: updatedReservations
    }
    
    setBooking(bookingModel)
    setShowPaymentForm(true)
  }

  const handleBack = () => {
    router.push(`/${urlParams.locale}/booking/${urlParams.id}`)
  }
  
  return (
    <>
      <Steps currentStep={2} />
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]'>
        {!showPaymentForm ? (
          <GuestDetailsForm 
            onSubmit={handleSubmit}
            onBack={handleBack}
            isLoading={false}
          />
        ) : (
          <PaymentForm 
            amount={booking?.totalAmount || 0}
          />
        )}
        <SummaryCard />
      </div>
    </>
  )
}

export default PaymentPage
