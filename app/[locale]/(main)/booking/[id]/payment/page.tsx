'use client'
import { useRouter, useParams } from 'next/navigation'
import { useBookingStore } from '@/store/useBookingStore'
import { GuestDetailsFormData } from '@/types/schemas'
import GuestDetailsForm from './components/GuestDetailsForm'
import Steps from '../components/Steps'
import SummaryCard from '../components/SummaryCard'

const GuestDetailsPage = () => {
  const router = useRouter()
  const params = useParams()
  const setBooking = useBookingStore(state => state.setBooking)
  const booking = useBookingStore(state => state.booking)

  const handleSubmit = (data: GuestDetailsFormData) => {
    if (!booking?.reservations) {
      console.error('Booking data is missing')
      return
    }

    const address = {
      addressLine1: data.street_address,
      addressLine2: data.house_number,
      postalCode: data.postal_code,
      city: data.city,
      countryCode: data.country,
    }

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

    setBooking({
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
    })

    router.push(`/${params.locale}/booking/${params.id}/payment/checkout`)
  }

  return (
    <>
      <Steps currentStep={2} />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]">
        <GuestDetailsForm onSubmit={handleSubmit} isLoading={false} />
        <SummaryCard />
      </div>
    </>
  )
}

export default GuestDetailsPage
