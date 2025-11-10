'use client'
import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'
import { useRooms } from '@/app/hooks/useRooms'
const RoomsSection = () => {
  const { data: rooms = [], isLoading, isError } = useRooms()
  console.log(rooms[0], 'rooms')
  if (isLoading) {
    return (<>Loading rooms…</>)}

  if (isError || rooms.length === 0) {
    return null
  }

  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center justify-between gap-10'>
        <div className='flex items-center gap-2'>
          <div className='size-5 rounded-full bg-blue' />
          <h2 className='font-medium text-[40px]'>Featured rooms</h2>
        </div>
        <Button variant='outline' className='px-[45px]'>View all</Button>
      </div>
      <span className='w-full text-dark text-lg mb-[50px]'>Comfort and freedom — all in one listing.</span>
      <RoomsCarousel items={rooms} />
    </div>
  )
}

export default RoomsSection

const items = [
  {
    id: '1',
    title: 'Deluxe Ocean View Suite',
    image: '/images/room.jpg',
    extra: 'Balcony',
    price: 250,
    squareMeters: 45,
    beds: 'King 200/200'
  }
]