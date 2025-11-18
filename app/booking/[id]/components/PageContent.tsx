'use client'
import PhotoGallery from "@/app/rooms/[id]/components/PhotoGallery"
import RoomContent from "@/app/rooms/[id]/components/RoomContent"
import { useBookingStore } from "@/store/bookingStore"
import ExtrasSection from "./ExtrasSection"
import RefundCard from "./RefundCard"
import BookingMenu from "./BookingMenu"
import { Beds24RoomType } from "@/types/beds24"
import GuestDetailsForm from "./GuestDetailsForm"
import SummaryCard from "./SummaryCard"
import PaymentForm from "./PaymentForm"

const PageContent = ({
  room,
  from,
  to,
  adults,
  children,
  filledRooms,
}: {
  room: Beds24RoomType
  from?: string
  to?: string
  adults?: string
  children?: string
  filledRooms: { id: number; adults: number; children: number }[] 
}) => {
  const { bookingPage } = useBookingStore()

  return (
    <>
      {bookingPage === 1 && 
        <>  
        <PhotoGallery />
        <div className='grid grid-cols-3 mb-[30px]'>
          <div className='col-span-2 flex flex-col pr-10'>
            <RoomContent room={room} />
            <ExtrasSection extras={room.extras} />
          </div>
          <div className='col-span-1 gap-5 flex flex-col'>
            <RefundCard />
            <BookingMenu 
              room={room} 
              params={{ from: from || undefined, to: to || undefined, adults: adults || undefined, children: children || undefined }} 
              filledRooms={filledRooms} 
            />
          </div>
        </div>
      </>
      }
      {bookingPage === 2 && 
        <div className='grid grid-cols-3 gap-10 pb-[30px]'>
          <GuestDetailsForm />
          <SummaryCard />
        </div>
      }
      {bookingPage === 3 && <div className='grid grid-cols-3 gap-10 pb-[30px]'>
          <PaymentForm />
          <SummaryCard />
        </div>}
    </>
  )
}

export default PageContent