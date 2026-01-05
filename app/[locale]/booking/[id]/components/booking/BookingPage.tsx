'use client'
import { useEffect } from "react";
import PhotoGallery from "@/app/[locale]/rooms/[id]/components/PhotoGallery"
import RoomContent from "@/app/[locale]/rooms/[id]/components/RoomContent"
import ExtrasSection from "./ExtrasSection"
import RefundCard from "./RefundCard"
import BookingMenu from "./BookingMenu"
import { Room } from "@/types/types"
import { Service } from "@/types/apaleo"
import { RoomOffer } from "@/types/offers"
import { useBookingStore } from "@/store/useBookingStore"
import { useStore } from "@/store/useStore"
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
  const setParams = useBookingStore(state => state.setParams)
  const clearBooking = useBookingStore(state => state.clearBooking)
  const bookingId = useBookingStore(state => state.bookingId)
  const setBookingId = useBookingStore(state => state.setBookingId)
  const setValue = useStore(state => state.setValue)
  
  const nights = calculateNights(from as string, to as string)
  const planType = getType(nights, true)
  const mainRoom = rooms.find(room => room.code === planType) || rooms[0]

  useEffect(() => {
    if (typeof window === 'undefined') return // Skip SSR
    
    if (!useBookingStore.persist.hasHydrated()) {
      useBookingStore.persist.rehydrate()
      return
    }
    
    const currentBookingId = `${mainRoom?.id || mainRoom?.code}-${from}-${to}-${adults}-${children}`
    
    if (bookingId && bookingId !== currentBookingId) {
      // Параметры изменились - очищаем и заполняем заново
      clearBooking()
      setValue(1, 'bookingPage')
      setRooms(filledRooms)
      setBookingId(currentBookingId)
    } else if (!bookingId) {
      // Первая загрузка - всегда устанавливаем новые параметры
      setBookingId(currentBookingId)
      setRooms(filledRooms)
    }
  }, [from, to, adults, children, mainRoom?.id, mainRoom?.code])

  useEffect(() => {
    if (typeof window === 'undefined') return // Skip SSR
    if (!useBookingStore.persist.hasHydrated()) return
    
    const currentBookingId = `${mainRoom?.id || mainRoom?.code}-${from}-${to}-${adults}-${children}`
    const storedRoomDetails = useBookingStore.getState().roomDetails
    const storedBookingId = useBookingStore.getState().bookingId
    
    if (storedBookingId !== currentBookingId || !storedRoomDetails) {
      setParams({ from, to, nights })
      setRoomDetails(mainRoom)
    }
  }, [from, to, adults, children, mainRoom?.id, mainRoom?.code])

  return (
    <>  
      <PhotoGallery images={mainRoom?.images || []} />
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