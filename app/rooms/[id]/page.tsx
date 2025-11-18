import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import { getSingleRoomData } from '@/services/getSingleRoomData'
import ErrorCard from '../components/ErrorCard'
import Availability from './components/Availability'

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
  const { from, to, adults, children } = await searchParams
   
  const room = await getSingleRoomData(id, from, to)
  if ('error' in room) return <ErrorCard isSingleRoom={true} link='/rooms' />

  return (
    <div className='flex flex-col relative container px-[100px] pt-10 flex-1'>
      <PhotoGallery />
      <div className='grid grid-cols-4 gap-10 mb-[30px]'>

        <div className='col-span-3 flex flex-col'>
          <RoomContent room={room} />
          {room?.unitsAvailable?.availability && Object.keys(room.unitsAvailable.availability).length > 0 && (
            <Availability 
              id={id}
              params={{ 
                from: from || undefined,
                to: to || undefined, 
                adults: adults || undefined, 
                children: children || undefined
              }} 
              availability={Object.values(room.unitsAvailable.availability)[0]} 
            />
          )}
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