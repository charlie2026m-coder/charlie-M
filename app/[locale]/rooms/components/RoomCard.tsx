import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/[locale]/home/components/PhotoSlider'
import { Link } from '@/navigation'
import { getPath } from '@/lib/utils'
import { UrlParams } from '@/types/apaleo'
import { RoomOffer } from '@/types/offers'

import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import Price from '@/app/_components/ui/price'

const RoomCard = ({ 
  params,
  room,
}: { 
  params: UrlParams,
  room: RoomOffer
}) => {

  const queryString = getPath({ from: params.from, to: params.to, adults: params.adults, children: params.children })

  const roomsNeeded = Math.ceil(Number(params.adults || 1) / room.maxPersons);
  const price = roomsNeeded * room.timeSlices[0].totalGrossAmount.amount;

  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={room.images} roomName={room.name} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <h2 className='text-xl font-medium jakarta mb-3'>{roomsNeeded > 1 ? `${roomsNeeded} X ` : ''}{room.name}</h2>
        <RoomParamsRow attributes={room.attributes} maxPersons={room.maxPersons} size={room.size} />
        <div className='text-mute mb-5 mt-auto'>per night from</div>

        <div className='flex xxs:flex-row flex-col items-center gap-2 md:gap-8 justify-between w-full'>
          <Price price={price.toFixed(2)} className='h-[50px] w-full xs:w-auto' />
          <Link href={`/rooms/${room.id}?${queryString}`} className='w-full'>  
            <Button variant='outline' className='h-[50px] w-full'>Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RoomCard