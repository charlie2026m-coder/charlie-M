import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/_components/Home/PhotoSlider'
import Link from 'next/link'
import { getPath } from '@/lib/utils'
import { Beds24RoomType, UrlParams } from '@/types/beds24'

const RoomCard = ({ 
  params,
  room,
}: { 
  params: UrlParams,
  room: Beds24RoomType
}) => {
  const images = [
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
  ]
  const queryString = getPath({ from: params.from, to: params.to, adults: params.adults, children: params.children })
  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} category={room.roomType} />
      <div className='flex flex-col p-4 px-6 pb-6 h-full'>
        <div className='grid grid-cols-3 gap-5'>
          <div className='flex flex-col col-span-2' >
            <h2 className='text-xl font-medium jakarta mb-3'>{room.name}</h2>
            <div className='flex items-center gap-1 mb-3'>
              <span className='text-dark text-sm'>{room.roomSize}m²</span>
              <div className='size-[7px] rounded-full bg-blue'/>
              <span className='text-dark text-sm'>{room.roomType}</span>
              {room.hasBalcony && <>
                <div className='size-[7px] rounded-full bg-blue'/>
                <span className='text-dark text-sm'>Balcony</span>
              </>}
            </div>
          </div>
          <div className='col-span-1 flex flex-col items-end'>
            <div className='text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{room.minPrice.toFixed(2)}</div>
            <div className='text-brown'>per night from</div>
          </div>

        </div>
        <p className='mb-10 text-[13px] inter font-[400] '>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
        
        
          <Link href={`/rooms/${room.id}?${queryString}`} className='mt-auto'>  
            <Button className='h-[55px] w-full'>Explore and Book</Button>
          </Link>
      </div>
    </div>
  )
}

export default RoomCard