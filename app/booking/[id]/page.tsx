import Steps from './components/Steps'
import { getSingleRoomData } from '@/services/getSingleRoomData'
import ErrorCard from '@/app/rooms/components/ErrorCard'
import {  sortGuestsByRooms } from '@/lib/utils'
import PageContent from './components/PageContent'


interface IParams {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    from?: string
    to?: string
    adults?: string
    children?: string
  }>
}

const BookingPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params
  const { from, to, adults, children } = await searchParams

  const room = await getSingleRoomData(id, from, to)

  if ('error' in room) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const filledRooms = sortGuestsByRooms(room.adults, room.children, Number(adults), Number(children))

  return (
    <section className='container px-[100px] pt-8'>
      <Steps  />
      <PageContent 
        room={room} 
        from={from} 
        to={to} 
        adults={adults} 
        children={children} 
        filledRooms={filledRooms} 
      />

    </section>
  )
}

export default BookingPage
