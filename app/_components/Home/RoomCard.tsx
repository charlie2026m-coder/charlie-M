import { Button } from '../ui/button'
import PhotoSlider from './PhotoSlider'
import Link from 'next/link'
import { Beds24RoomType } from '@/types/beds24'
import Dot from '../ui/dot'
const RoomCard = ({ 
  item,
}: { 
  item: Beds24RoomType
}) => {
  
  const images = [
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
  ]

  const isBalcony = item.features?.includes('BALCONY');
  return (
    <div className='w-[400px] flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <h2 className='text-xl font-medium jakarta mb-3'>{item.name}</h2>
        <div className='flex items-center gap-1 mb-3'>
          <span className='text-dark text-sm'>{item.roomSize}m²</span>
          <Dot size={7} color='blue' /> 
          <span className='text-dark text-sm'>{item.roomType}</span>
          {isBalcony && <> 
            <Dot size={7} color='blue' />
            <span className='text-dark text-sm'>Balcony</span>
          </>}
        </div>
        <div className='flex items-center justify-between mb-4'>
          <div className='text-brown '>per night from</div>
          <div className='text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{item.minPrice.toFixed(2)}</div>
        </div>

        <div className='flex items-center justify-between mt-auto'>
          <Link href={`/rooms`}>  
            <Button variant='outline' className='h-[55px]'>Discover More</Button>
          </Link>
          <Link href={`/rooms/${item.id}`}>  
            <Button className='h-[55px]'>Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RoomCard