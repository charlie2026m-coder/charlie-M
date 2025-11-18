import Link from 'next/link'
import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'
import { getRoomsData } from '@/services/getRoomsData'
import ErrorCard from '@/app/rooms/components/ErrorCard'

const RoomsSection = async () => {
  const rooms = await getRoomsData()
  
  // Show fallback UI if no rooms available (e.g., API error)
  if ('error' in rooms || !rooms || rooms.length === 0) {
    return <ErrorCard link='/' isSingleRoom={false} />
  }
  
  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center justify-between gap-10'>
        <div className='flex items-center gap-2'>
          <div className='size-5 rounded-full bg-blue' />
          <h2 className='font-medium text-[40px]'>Featured rooms</h2>
        </div>
        <Link href='/rooms'>
          <Button variant='outline' className='px-[45px]'>View all</Button>
        </Link>
      </div>
      <span className='w-full text-dark text-lg mb-[50px]'>Comfort and freedom — all in one listing.</span>
      <RoomsCarousel items={rooms} />
    </div>
  )
}

export default RoomsSection