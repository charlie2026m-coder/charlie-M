'use client'
import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import Availability from './components/Availability'
import { useRoomById } from '@/app/hooks/useRooms'
import { useParams } from 'next/navigation'
import dayjs from 'dayjs'

const RoomPage = () => {
  const params = useParams()
  const id = params.id as string;
  const today = dayjs().format('YYYY-MM-DD')
  const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')

  const { data: room, isLoading, isError } = useRoomById(id, `&from=${today}&to=${nextYear}`);
  if (isError) return <div>Error: {(isError as unknown as Error).message}</div>

  return (
    <div className='flex flex-col relative container px-[100px] pt-10 flex-1'>
      <PhotoGallery />
      <div className='grid grid-cols-4 gap-10 mb-[30px]'>

        <div className='col-span-3 flex flex-col'>
          <RoomContent room={room} isLoading={isLoading} />
          <Availability />
        </div>
        <div className='col-span-1'>
          <BookingForm id={id} />   
        </div>
      </div>
    </div>
  )
}

export default RoomPage