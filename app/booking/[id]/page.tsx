import Steps from './components/Steps'
import { getSingleRoomData } from '@/services/getSingleRoomData'
import ErrorCard from '@/app/rooms/components/ErrorCard'
import {  sortGuestsByRooms } from '@/lib/utils'
import StepsContent from './components/StepsContent'
import { Room } from '@/types/types'

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
  const room = await getSingleRoomData(id, from, to)
  if ('error' in room) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const filledRooms: Room[] = sortGuestsByRooms(room.adults, room.children, Number(adults), Number(children), {from, to})
  return (
    <section className='container px-4 md:px-10 xl:px-[100px] pt-8'>
      <Steps  />
      <StepsContent 
        room={room} 
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
