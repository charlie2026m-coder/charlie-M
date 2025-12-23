'use client'
import GuestDetailsForm from "./booking/GuestDetailsForm"
import SummaryCard from "./booking/SummaryCard"
import PaymentForm from "./PaymentForm"
import { useStore } from "@/store/useStore"
import BookingPage from "./booking/BookingPage"
import { Room, RoomDetails } from "@/types/types"

const StepsContent = ({
  room,
  from,
  to,
  adults,
  children,
  filledRooms,
}: {
  room: RoomDetails
  from: string
  to: string
  adults: string
  children: string
  filledRooms: Room[] 
}) => {
  const bookingPage = useStore(state => state.bookingPage)

  if(bookingPage === 1) {
    return (
      <BookingPage params={{ from, to, adults, children, room, filledRooms }}/>
    )
  }
  if(bookingPage === 2) {
    return <div className='grid grid-cols-3 gap-10 pb-[30px]'><GuestDetailsForm /><SummaryCard /> </div>
  }
  if(bookingPage === 3) {
    return <div className='grid grid-cols-3 gap-10 pb-[30px]'><PaymentForm /><SummaryCard /></div>
  }
}

export default StepsContent