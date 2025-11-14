'use client'
import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import Availability from './components/Availability'
import { useRoomById } from '@/app/hooks/useRooms'
import { useParams, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { getPath } from '@/lib/utils'

const RoomPage = () => {
  const params = useParams()
  const id = params.id as string;
  
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const adults = searchParams.get('adults')
  const children = searchParams.get('children')
  
  const today = dayjs().format('YYYY-MM-DD')
  const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')
  
  const queryString = getPath({ 
    from: from || today, 
    to: to || nextYear, 
    adults: adults || '1', 
    children: children || '0'
  })
  const { data: room, isLoading, isError } = useRoomById(id, queryString);
  
  if (isError) return <div>Error: {(isError as unknown as Error).message}</div>

  return (
    <div className='flex flex-col relative container px-[100px] pt-10 flex-1'>
      <PhotoGallery />
      <div className='grid grid-cols-4 gap-10 mb-[30px]'>

        <div className='col-span-3 flex flex-col'>
          <RoomContent room={room} isLoading={isLoading} />
          {room?.unitsAvailable?.availability && <Availability availability={room?.unitsAvailable?.availability[0]} />}
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