import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/_components/Home/PhotoSlider'
import Link from 'next/link'
import { getPath } from '@/lib/utils'
import { UrlParams } from '@/types/apaleo'
import { RoomOffer } from '@/types/offers'

import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'

const RoomCard = ({ 
  params,
  room,
}: { 
  params: UrlParams,
  room: RoomOffer
}) => {
  const images = [
    '/images/room1.webp',
    '/images/room2.webp',  
    '/images/room3.webp',
    '/images/room2.webp',
    '/images/room1.webp',
  ]
  const queryString = getPath({ from: params.from, to: params.to, adults: params.adults, children: params.children })
  const price = room.timeSlices[0].totalGrossAmount.amount
  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} category={room.name} />
      <div className='flex flex-col px-2 py-4 pb-6 flex-1'>
        <h2 className='text-xl text-mute font-bold jakarta mb-2'>{room.name}</h2>
        <div className='flex lg:flex-col xl:flex-row xl:items-center  justify-between gap-3 mb-3 mt-auto'>
          <div className='text-mute'>per night from</div>
          <div className='text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2 self-end'>€{price.toFixed(2)}</div>
        </div>
        <div className='flex items-center gap-1 mb-4'>
          <RoomParamsRow attributes={room.attributes} maxPersons={room.maxPersons} size={room.size} />
        </div>


        
          <Link href={`/rooms/${room.id}?${queryString}`}>  
            <Button className='h-[55px] w-full'>Explore and Book</Button>
          </Link>
      </div>
    </div>
  )
}

export default RoomCard