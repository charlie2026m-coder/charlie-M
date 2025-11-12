import Link from 'next/link'
import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'
import dayjs from 'dayjs'

async function getRooms() {
  const today = dayjs().format('YYYY-MM-DD')
  const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${url}/api/rooms?from=${today}&to=${nextYear}&adults=1&children=0`, {
    cache: 'no-store' 
  })
  if (!res.ok) {
    throw new Error('Failed to fetch rooms')
  }
  return res.json()
}
const RoomsSection = async () => {
  const rooms = await getRooms()
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