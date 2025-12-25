import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import { getSingleRoom } from '@/services/getSingleRoom'
import ErrorCard from '../components/ErrorCard'
import Availability from './components/Availability'
import { calculateNights } from '@/lib/utils'

interface IParams {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    from?: string
    to?: string
    adults?: string
    children?: string
  }>
}

const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params
  const { from, to, adults, children = '1' } = await searchParams
  
  const guests = Number(adults || 0) + Number(children || 0)
  const rooms = await getSingleRoom(id, from, to, guests)
  if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const nights = calculateNights(from as string, to as string);
  const type = nights > 7  ? 'LONG_STAY' : 'BAR_WEB';
  const filteredRooms = rooms.filter(room => room.code.includes(type));
  const room = filteredRooms[0]

  return (
    <div className='flex flex-col relative container px-4 md:px-10 xl:px-[100px] pt-10 flex-1'>
      <PhotoGallery />
      <div className='grid grid-cols-1  lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>

        <div className='col-span-2 xl:col-span-3 flex flex-col'>
           <RoomContent room={room} />
            <Availability 
              id={id}
              from={from}
              to={to}
              children={children}
              adults={adults}
            />
        </div>
        <div className='col-span-1'>
          <BookingForm 
            id={id} 
            room={room}
            params={{ 
              from: from || undefined,
              to: to || undefined, 
              adults: adults || undefined, 
              children: children || undefined
            }} 
          />   
        </div>
      </div>
    </div>
  )
}

export default RoomPage