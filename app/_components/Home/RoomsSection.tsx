import Link from 'next/link'
import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'
import ErrorCard from '@/app/rooms/components/ErrorCard'
import { getApaleoRooms } from '@/services/getApaleoRooms'

const RoomsSection = async () => {
  const rooms = await getApaleoRooms()
  console.log(rooms, 'apaleo rooms xxxx')
  // Show fallback UI if no rooms available (e.g., API error)
  if ('error' in rooms || !rooms || rooms.length === 0) {
    return <ErrorCard link='/' isSingleRoom={false} />
  }
  
  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center justify-between gap-10'>
        <div className='flex items-center gap-2'>
          <h2 className='font-medium text-[40px]'>Choose Your Room</h2>
        </div>
        <Link href='/rooms' className='hidden md:block'>
          <Button variant='outline' className='px-[45px] h-12'>View all</Button>
        </Link>
      </div>
      <span className='w-full text-dark text-lg mb-[50px]'>Your perfect room, just a click away.</span>
      <RoomsCarousel items={rooms} />
      <Link href='/rooms' className='block md:hidden mt-5 '>
          <Button variant='outline' className='px-[45px] !h-[48px] w-full'>View all</Button>
        </Link>
    </div>
  )
}

export default RoomsSection
