'use client'
import { useEffect } from "react";
import PhotoGallery from "@/app/[locale]/(main)/rooms/[id]/components/PhotoGallery"
import RoomContent from "@/app/[locale]/(main)/rooms/[id]/components/RoomContent"
import ExtrasSection from "./ExtrasSection"
import RefundCard from "./RefundCard"
import BookingMenu from "./BookingMenu"
import { Room } from "@/types/types"
import { Service } from "@/types/apaleo"
import { RoomOffer } from "@/types/offers"
import { RoomDetails } from "@/app/actions/supabase/rooms/getRoomDetails"
import ChangeDate from "./ChangeDate"
import { useBookingStore } from "@/store/useBookingStore"
import { calculateNights } from "@/lib/utils"
import { resolveRatePlan } from "@/lib/Constants"
import { useTranslations } from "next-intl"
import {
  BOOKING_SECTION_ID,
  useScrollToBookingSection,
} from "@/app/hooks/useScrollToBookingSection"

const BookingPage = ({
  params,
}: {
  params: {
    from: string
    to: string
    adults: string
    children: string
    rooms: RoomOffer[]
    roomDetail?: RoomDetails
    filledRooms: Room[]
    extras: Service[]
    isKidsBedAvailable?: boolean
    babyBedAvailability?: { isAvailable: boolean; count: number }
    isUnavailable?: boolean
  }
}) => {
  const { from, to, adults, children, rooms, roomDetail, filledRooms, extras, isKidsBedAvailable = true, babyBedAvailability, isUnavailable = false } = params
  const setRooms = useBookingStore(state => state.setRooms)
  const setRoomDetails = useBookingStore(state => state.setRoomDetails)
  const setParams = useBookingStore(state => state.setParams)
  const setExtras = useBookingStore(state => state.setExtras)
  const clearBooking = useBookingStore(state => state.clearBooking)
  const setBookingId = useBookingStore(state => state.setBookingId)
  const isExtend = useBookingStore(state => state.isExtend)
  const setIsExtend = useBookingStore(state => state.setIsExtend)
  const booking = useBookingStore(state => state.booking)
  const setBooking = useBookingStore(state => state.setBooking)
  const nights = calculateNights(from as string, to as string)
  const mainRoom = resolveRatePlan(rooms, nights, false)
  const tCommon = useTranslations()

  useScrollToBookingSection()

  // These effects MUST be declared before the early returns below (Rules of
  // Hooks) — otherwise a date change that drops mainRoom to null renders fewer
  // hooks than the previous render and crashes the page. They no-op internally
  // on the unavailable / no-rate-plan paths.
  useEffect(() => {
    if (typeof window === 'undefined') return // Skip SSR
    if (isUnavailable || !mainRoom) return

    if (!useBookingStore.persist.hasHydrated()) {
      useBookingStore.persist.rehydrate()
      return
    }

    const storedBookingId = useBookingStore.getState().bookingId
    const storedRooms = useBookingStore.getState().rooms

    const currentBookingId = `${mainRoom.id || mainRoom.ratePlan?.id}-${from}-${to}-${adults}-${children}`

    if (storedBookingId && storedBookingId !== currentBookingId) {
      if (isExtend && booking?.booker) {
        const savedBooker = booking.booker
        clearBooking()
        setBooking({ booker: savedBooker, reservations: [] })
        setIsExtend(false)
      } else {
        clearBooking()
      }
      setRooms(filledRooms as Room[])
      setBookingId(currentBookingId)
    } else if (!storedBookingId) {
      if (!storedRooms || storedRooms.length === 0) {
        setBookingId(currentBookingId)
        setRooms(filledRooms as Room[])
      } else {
        setBookingId(currentBookingId)
      }
    }
  }, [from, to, adults, children, mainRoom?.id, mainRoom?.ratePlan?.id, isKidsBedAvailable, isUnavailable])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isUnavailable || !mainRoom) return
    if (!useBookingStore.persist.hasHydrated()) return

    const currentBookingId = `${mainRoom.id || mainRoom.ratePlan?.id}-${from}-${to}-${adults}-${children}`
    const storedRoomDetails = useBookingStore.getState().roomDetails
    const storedBookingId = useBookingStore.getState().bookingId

    if (storedBookingId !== currentBookingId || !storedRoomDetails) {
      setParams({ from, to, nights })
      setRoomDetails(mainRoom)
      setExtras(extras)
    }
  }, [from, to, adults, children, mainRoom?.id, mainRoom?.ratePlan?.id, extras, isUnavailable])

  // When Apaleo is unavailable, show Supabase content with date picker only
  if (isUnavailable && roomDetail) {
    return (
      <>
        <PhotoGallery images={roomDetail.photos || []} />
        <div id={BOOKING_SECTION_ID} className='scroll-mt-24 grid grid-cols-1 lg:grid-cols-3 mb-[30px]'>
          <div className='col-span-1 lg:col-span-2 flex flex-col lg:pr-10'>
            <RoomContent room={{ name: roomDetail.title_en, attributes: roomDetail.attributes, maxPersons: roomDetail.max_persons, size: roomDetail.size, description: roomDetail.description_en ?? '', images: roomDetail.photos } as any} />
          </div>
          <div className='col-span-1 gap-5 flex flex-col'>
            <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border'>
              <ChangeDate arrival={from} departure={to} />
              <p className='my-8 text-center text-gray-500 text-sm px-2'>
                {tCommon('bookingForm.unavailableForDates')}
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!mainRoom) return <div className="p-10 text-center">{tCommon('bookingForm.unavailableForDates')}</div>

  return (
    <>  
      <PhotoGallery images={mainRoom.images || []} />
      <div id={BOOKING_SECTION_ID} className='scroll-mt-24 grid grid-cols-1 lg:grid-cols-3 mb-[30px]'>
        <div className='col-span-1 lg:col-span-2 flex flex-col lg:pr-10'>
          <RoomContent room={mainRoom} />
          {extras.length > 0 && 
          <ExtrasSection
            nights={nights}
            extras={extras}
            arrival={from}
          />}
        </div>
        <div className='col-span-1 gap-5 flex flex-col'>
          <RefundCard rooms={rooms} nights={nights} checkInDate={from} />
          <BookingMenu 
            rooms={rooms} 
            params={{ from, to, adults, children }} 
            filledRooms={filledRooms}
            isKidsBedAvailable={isKidsBedAvailable}
            babyBedAvailability={babyBedAvailability}
          />
        </div>
      </div>
    </>
  )
}

export default BookingPage