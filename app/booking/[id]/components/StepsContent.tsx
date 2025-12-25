'use client'
import GuestDetailsForm from "./payment/GuestDetailsForm"
import SummaryCard from "./booking/SummaryCard"
import PaymentForm from "./payment/PaymentCard" 
import { useStore } from "@/store/useStore"
import BookingPage from "./booking/BookingPage"
import { Room } from "@/types/types"
import { RoomOffer } from "@/types/offers"
import { Service } from "@/types/apaleo"
import SuccessSection from "./payment/SuccessSection"

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
  const bookingPage = useStore(state => state.bookingPage)

  if(bookingPage === 1) {
    return (
      <BookingPage params={{ from, to, adults, children, rooms, filledRooms, extras }}/>
    )
  }
  if(bookingPage === 2) {
    return <div className='grid grid-cols-3 gap-10 pb-[30px]'><GuestDetailsForm /><SummaryCard /> </div>
  }
  if(bookingPage === 3) {
    return <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]'>
      <SuccessSection />   
      {/* <PaymentForm /> */}
    <SummaryCard /></div>
  }
}

export default StepsContent