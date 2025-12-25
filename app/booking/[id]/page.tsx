import Steps from './components/Steps'
import { getSingleRoom } from '@/services/getSingleRoom'
import ErrorCard from '@/app/rooms/components/ErrorCard'
import {  sortGuestsByRooms } from '@/lib/utils'
import StepsContent from './components/StepsContent'
import { Room } from '@/types/types'
import { getApaleoExtras } from '@/services/getExtras'

interface IParams {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    from: string
    to: string
    adults?: string
    children?: string
  }>
}

const BookingPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params
  const { from, to, adults, children } = await searchParams
  const guests = Number(adults || 0) + Number(children || 0)
  const rooms = await getSingleRoom(id, from, to, guests)
  const extras = await getApaleoExtras()
  if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const filledRooms = sortGuestsByRooms(rooms[0].maxPersons, 0, Number(adults), Number(children), {from, to})

  
  return (
    <section className='container px-4 md:px-10 xl:px-[100px] pt-8'>
      <Steps />
      <StepsContent 
        rooms={rooms} 
        extras={extras}
        from={from} 
        to={to} 
        adults={adults || '1'} 
        children={children || '0'} 
        filledRooms={filledRooms} 
      />
    </section>
  )
}

export default BookingPage
