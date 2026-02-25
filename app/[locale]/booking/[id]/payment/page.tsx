'use client'
import { useState } from 'react'
import { useBookingStore } from '@/store/useBookingStore'
import { GuestDetailsFormData } from '@/types/schemas'
import Steps from '../components/Steps'
import GuestDetailsForm from './components/GuestDetailsForm'
import PaymentForm from './components/PaymentForm'
import SummaryCard from '../components/SummaryCard'
import PaymentBanner from '@/app/_components/ui/PaymentBanner'

const PaymentPage = () => {
  const setBooking = useBookingStore(state => state.setBooking)
  const booking = useBookingStore(state => state.booking)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const handleSubmit = (data: GuestDetailsFormData) => {
    if (!booking || !booking.reservations) {
      console.error('Booking data is missing')
      return
    }
        // Prepare address object for Apaleo
    const address = {
      addressLine1: data.street_address,
      addressLine2: data.house_number,
      postalCode: data.postal_code,
      city: data.city,
      countryCode: data.country,
    }

    // Prepare company object if company name is provided
    const company = data.company_name ? { name: data.company_name } : undefined

    const updatedReservations = booking.reservations.map(reservation => ({
      ...reservation,
      primaryGuest: {
        ...reservation.primaryGuest,
        firstName: data.name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address,
        company,
      }
    }))
    
    const bookingModel = {
      booker: {
        firstName: data.name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address,
        company,
      },
      consent: data.consent,
      totalAmount: booking.totalAmount,
      reservations: updatedReservations
    }
    
    setBooking(bookingModel)
    setShowPaymentForm(true)
  }
  
  return (
    <>
      <Steps currentStep={2} />
      {showPaymentForm && (
        <PaymentBanner />
      )}
      <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px] ${showPaymentForm ? 'pt-16' : ''}`}>
        {!showPaymentForm ? (
          <GuestDetailsForm 
            onSubmit={handleSubmit}
            isLoading={false}
          />
        ) : (
          <PaymentForm amount={booking?.totalAmount || 0} />
        )}
        <SummaryCard />
      </div>
    </>
  )
}

export default PaymentPage
