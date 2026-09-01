import { getSingleRoom } from '@/services/getSingleRoom'
import { sortGuestsByRooms, getServiceAvailabilityById, selectBestRoomOffers, calculateNights } from '@/lib/utils'
import BookingPage from './components/BookingPage'
import BookingViewTracker from './components/BookingViewTracker'
import { getApaleoExtras } from '@/app/actions/apaleo/services/getExtras'
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import ErrorCard from '@/app/[locale]/(main)/rooms/components/ErrorCard'
import Steps from './components/Steps'

interface IParams {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ 
    from: string
    to: string
    adults?: string
    children?: string
    extend?: string
    unit?: string
  }>
}

const Booking = async ({ params, searchParams }: IParams) => {
  const { id, locale } = await params
  const { from, to, adults, children, extend, unit } = await searchParams
  
  if (!from || !to) return <ErrorCard isSingleRoom={true} link='/rooms' />
  
  const [apaleoResult, allRoomsDetails, babyBedAvailability, extras] = await Promise.all([
    getSingleRoom(id, from, to, adults, locale),
    getRoomDetails(),
    getServiceAvailabilityById(from, to, 'CMH-BAB', locale),
    getApaleoExtras(from, to, locale)
  ])

  // Supabase data — always available
  const roomDetail = allRoomsDetails.find(r => r.id === id)
  if (!roomDetail) return <ErrorCard isSingleRoom={true} link='/rooms' />

  // Apaleo data — optional
  const hasApaleoError = 'error' in apaleoResult
  const nights = calculateNights(from, to)
  const rooms = hasApaleoError ? [] : selectBestRoomOffers(apaleoResult, nights)
  // Full offer list (both non-refundable AND FLEX rate plans). selectBestRoomOffers
  // keeps only the NR offer, so the refundable toggle (RefundCard) needs the raw
  // list to find a FLEX plan to switch to — otherwise the toggle silently no-ops.
  const allOffers = hasApaleoError ? [] : apaleoResult
  const isUnavailable = rooms.length === 0

  const isKidsBedAvailable = roomDetail.attributes?.includes('kids') || false
  const filteredExtras = isKidsBedAvailable
    ? extras
    : extras.filter(extra => extra.id !== 'CMH-BAB')

  const mainRoom = rooms[0]
  const filledRooms = sortGuestsByRooms(
    Number(adults) || 1,
    Number(children) || 0,
    from,
    to,
    mainRoom?.maxPersons ?? roomDetail.max_persons
  )

  // GA4 add_to_cart: guest clicked "Book Now" and reached the booking step.
  // Value = this room's full-stay total for the chosen occupancy (offer price
  // already spans the whole date range).
  const addToCartValue = Number(adults) >= 2 && mainRoom?.priceForTwo
    ? mainRoom.priceForTwo
    : mainRoom?.price ?? 0

  return (
    <>
      {!isUnavailable && mainRoom && (
        <BookingViewTracker value={addToCartValue} roomName={mainRoom.name} />
      )}
      <Steps currentStep={1} />
      <BookingPage
        params={{
          rooms,
          allOffers,
          roomDetail: isUnavailable ? roomDetail : undefined,
          extras: filteredExtras,
          from,
          to,
          adults: adults || '1',
          children: children || '0',
          filledRooms,
          preferredUnitId: extend === '1' ? unit ?? null : null,
          isExtension: extend === '1',
          isKidsBedAvailable,
          babyBedAvailability,
          isUnavailable,
        }}
      />
    </>
  )
}

export default Booking
