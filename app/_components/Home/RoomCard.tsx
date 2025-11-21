import { Button } from '../ui/button'
import PhotoSlider from './PhotoSlider'
import Link from 'next/link'
import { Beds24RoomType } from '@/types/beds24'
import Price from '../ui/price'
import RoomParamsRow from '../ui/RoomParamsRow'

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
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <h2 className='text-xl font-medium jakarta mb-3'>{item.name}</h2>
        <RoomParamsRow item={item} />
        <div className='flex items-center justify-between mb-4  mt-auto'>
          <div className='text-brown '>per night from</div>
          <Price price={item.minPrice.toFixed(2)} />
        </div>

        <div className='flex items-center  lg:flex-col xl:flex-row justify-between w-full'>
          <Link href={`/rooms`} className="lg:w-full xl:w-auto lg:mb-3 xl:m-0">  
            <Button variant='outline' className='h-[55px] w-full'>Discover More</Button>
          </Link>
          <Link href={`/rooms/${item.id}`} className='lg:w-full xl:w-auto'>  
            <Button className='h-[55px] w-full '>Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RoomCard