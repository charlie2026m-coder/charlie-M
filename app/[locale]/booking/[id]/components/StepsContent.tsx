'use client'
import { useState } from 'react'
import SummaryCard from "./booking/SummaryCard"
import BookingPage from "./booking/BookingPage"
import { Room } from "@/types/types"
import { RoomOffer } from "@/types/offers"
import { Service } from "@/types/apaleo"
import SuccessSection from "./payment/SuccessSection"
import GuestInfo from "./guestInfo/GuestInfo"
import Steps from "./Steps"

const StepsContent = ({
  rooms,
  extras,
  from,
  to,
  adults,
  children,
  filledRooms,
}: {
  rooms: RoomOffer[]
  extras: Service[]
  from: string
  to: string
  adults: string
  children: string
  filledRooms: Room[] 
}) => {
  const [bookingPage, setBookingPage] = useState(1)

  return (
    <>
      <Steps bookingPage={bookingPage} setBookingPage={setBookingPage} />
      {bookingPage === 1 && (
        <BookingPage params={{ from, to, adults, children, rooms, filledRooms, extras }} setBookingPage={setBookingPage}/>
      )}
      {bookingPage === 2 && (
        <GuestInfo setBookingPage={setBookingPage} />
      )}
      {bookingPage === 3 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]'>
          <SuccessSection setBookingPage={setBookingPage} />   
          {/* <PaymentForm /> */}
        <SummaryCard /></div>
      )}
    </>
  )
}

export default StepsContent