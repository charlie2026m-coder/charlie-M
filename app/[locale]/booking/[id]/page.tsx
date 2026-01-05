import Steps from './components/Steps'
import { getSingleRoom } from '@/services/getSingleRoom'
import {  sortGuestsByRooms } from '@/lib/utils'
import StepsContent from './components/StepsContent'
import { getApaleoExtras } from '@/services/getExtras'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'

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
  const rooms = await getSingleRoom(id, from, to)
  const extras = await getApaleoExtras()
  if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const filledRooms = sortGuestsByRooms(Number(adults), Number(children), from, to, rooms[0].maxPersons)
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
