import { getSingleRoom } from '@/services/getSingleRoom'
import {  sortGuestsByRooms, getServiceAvailabilityById } from '@/lib/utils'
import BookingPage from './components/BookingPage'
import { getApaleoExtras } from '@/services/getExtras'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import Steps from './components/Steps'

interface IParams {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ 
    from: string
    to: string
    adults?: string
    children?: string
  }>
}

const Booking = async ({ params, searchParams }: IParams) => {
  const { id, locale } = await params
  const { from, to, adults, children } = await searchParams
  
  if (!from || !to) return <ErrorCard isSingleRoom={true} link='/rooms' />
  
  const [rooms, babyBedAvailability, extras] = await Promise.all([
    getSingleRoom(id, from, to, adults, locale),
    getServiceAvailabilityById(from, to, 'CMH-BAB'),
    getApaleoExtras(from, to)
  ])
  
  if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
  if (!rooms || rooms.length === 0) return <ErrorCard isSingleRoom={true} link='/rooms' />
  
  let filteredExtras = extras
  const isKidsBedAvailable = rooms[0].attributes?.includes('kids') || false
  if(!isKidsBedAvailable) filteredExtras = filteredExtras.filter(extra => extra.id !== 'CMH-BAB')

  const filledRooms = sortGuestsByRooms( Number(adults) || 1, Number(children) || 0, from, to, rooms[0]?.maxPersons || 2)
  return (
    <>
      <Steps currentStep={1} />
      <BookingPage 
        params={{ 
          rooms, 
          extras: filteredExtras,
          from, 
          to, 
          adults: adults || '1', 
          children: children || '0', 
          filledRooms,
          isKidsBedAvailable,
          babyBedAvailability
        }} 
      />
    </>
  )
}

export default Booking
