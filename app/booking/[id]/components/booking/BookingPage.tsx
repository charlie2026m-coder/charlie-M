import { useEffect } from "react";
import PhotoGallery from "@/app/rooms/[id]/components/PhotoGallery"
import RoomContent from "@/app/rooms/[id]/components/RoomContent"
import ExtrasSection from "./ExtrasSection"
import RefundCard from "./RefundCard"
import BookingMenu from "./BookingMenu"
import { Room } from "@/types/types"
import { Service } from "@/types/apaleo"
import { RoomOffer } from "@/types/offers"
import { useBookingStore } from "@/store/useBookingStore"
import { calculateNights, getType } from "@/lib/utils"

const BookingPage = ({
  params,
}: {
  params: {
    from: string
    to: string
    adults: string
    children: string
    rooms: RoomOffer[]
    filledRooms: Room[]
    extras: Service[]
  }
}) => {
  const { from, to, adults, children, rooms, filledRooms, extras } = params
  const setRooms = useBookingStore(state => state.setRooms)
  const setRoomDetails = useBookingStore(state => state.setRoomDetails)
  const isRefundable = useBookingStore(state => state.isRefundable)
  const setParams = useBookingStore(state => state.setParams)
  
  const nights = calculateNights(from as string, to as string)
  const planType = getType(nights, isRefundable)
  const mainRoom = rooms.find(room => room.code === planType) || rooms[0]

  useEffect(() => {
    if (!useBookingStore.persist.hasHydrated()) {
      useBookingStore.persist.rehydrate()
    }
    
    // Check and initialize rooms immediately after hydration
    const currentRooms = useBookingStore.getState().rooms
    if (!currentRooms || currentRooms.length === 0) {
      setRooms(filledRooms)
    }
  }, [filledRooms, setRooms])

  useEffect(() => {
    setParams({ from, to, nights })
    setRoomDetails(mainRoom)
  }, [isRefundable]) // Only when isRefundable changes

  return (
    <>  
      <PhotoGallery />
      <div className='grid grid-cols-1  lg:grid-cols-3 mb-[30px]'>
        <div className='col-span-1 lg:col-span-2 flex flex-col lg:pr-10'>
          <RoomContent room={mainRoom} />
          {extras.length > 0 && <ExtrasSection extras={extras} />}
        </div>
        <div className='col-span-1 gap-5 flex flex-col'>
          <RefundCard rooms={rooms}  />
          <BookingMenu 
            rooms={rooms} 
            params={{ from, to, adults, children }} 
            filledRooms={filledRooms} 
          />
        </div>
      </div>
    </>
  )
}

export default BookingPage