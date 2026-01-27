import { getSingleRoom } from '@/services/getSingleRoom'
import {  sortGuestsByRooms } from '@/lib/utils'
import BookingPage from './components/BookingPage'
import { getApaleoExtras } from '@/services/getExtras'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import Steps from './components/Steps'

interface IParams {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    from: string
    to: string
    adults?: string
    children?: string
  }>
}

const Booking = async ({ params, searchParams }: IParams) => {
  const { id } = await params
  const { from, to, adults, children } = await searchParams
  
  // Validate required params
  if (!from || !to) {
    return <ErrorCard isSingleRoom={true} link='/rooms' />
  }
  
  const rooms = await getSingleRoom(id, from, to, adults)
  let extras = await getApaleoExtras(from, to)

  if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const isKidsBedAvailable = rooms[0].attributes.includes('kids')
  if(!isKidsBedAvailable) extras = extras.filter(extra => extra.id !== 'CMH-BAB')

  const filledRooms = sortGuestsByRooms(Number(adults), Number(children), from, to, rooms[0].maxPersons)
  return (
    <>
      <Steps currentStep={1} />
      <BookingPage 
        params={{ 
          rooms, 
          extras,
          from, 
          to, 
          adults: adults || '1', 
          children: children || '0', 
          filledRooms,
          isKidsBedAvailable
        }} 
      />
    </>
  )
}

export default Booking
