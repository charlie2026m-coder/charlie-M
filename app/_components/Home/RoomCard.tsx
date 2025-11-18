import { Button } from '../ui/button'
import PhotoSlider from './PhotoSlider'
import Link from 'next/link'
import { Beds24RoomType } from '@/types/beds24'
import Dot from '../ui/dot'
import Price from '../ui/price'
import { BsFillPersonFill } from "react-icons/bs";

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

  return (
    <div className='w-[400px] flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <h2 className='text-xl font-medium jakarta mb-3'>{item.name}</h2>
        <div className='flex items-center gap-1 mb-3'>
          <span className='text-dark text-sm flex items-center gap-1'> <BsFillPersonFill className='size-4 text-blue' />{item.adults} Max.</span>
          <Dot size={7} color='blue' /> 

          <span className='text-dark text-sm'>{item.roomSize}m²</span>
          <Dot size={7} color='blue' /> 
          <span className='text-dark text-sm'>{item.roomType}</span>
          {item.hasBalcony && <> 
            <Dot size={7} color='blue' />
            <span className='text-dark text-sm'>Balcony</span>
          </>}
        </div>
        <div className='flex items-center justify-between mb-4  mt-auto'>
          <div className='text-brown '>per night from</div>
          <Price price={item.minPrice.toFixed(2)} />
        </div>

        <div className='flex items-center justify-between'>
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