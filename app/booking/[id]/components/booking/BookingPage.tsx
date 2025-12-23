import { useEffect } from "react"
import PhotoGallery from "@/app/rooms/[id]/components/PhotoGallery"
import RoomContent from "@/app/rooms/[id]/components/RoomContent"
import ExtrasSection from "./ExtrasSection"
import RefundCard from "./RefundCard"
import BookingMenu from "./BookingMenu"
import { Room, RoomDetails } from "@/types/types"
import { useBookingStore } from "@/store/useBookingStore"
import { extraItems } from "@/content/content"

const BookingPage = ({
  params,
}: {
  params: {
    from: string
    to: string
    adults: string
    children: string
    room: RoomDetails
    filledRooms: Room[]
  }
}) => {
  const { from, to, adults, children, room, filledRooms } = params
  const { setRooms, setRoomDetails } = useBookingStore()
  useEffect(() => {
    setRooms(filledRooms)
    setRoomDetails(room)
  }, [filledRooms])

  return (
    <>  
      <PhotoGallery />
      <div className='grid grid-cols-1  lg:grid-cols-3 mb-[30px]'>
        <div className='col-span-1 lg:col-span-2 flex flex-col pr-10'>
          <RoomContent room={room} />
          {extraItems.length > 0 && <ExtrasSection extras={extraItems} />}
        </div>
        <div className='col-span-1 gap-5 flex flex-col'>
          <RefundCard />
          <BookingMenu 
            room={room} 
            params={{ from, to, adults, children }} 
            filledRooms={filledRooms} 
          />
        </div>
      </div>
    </>
  )
}

export default BookingPage