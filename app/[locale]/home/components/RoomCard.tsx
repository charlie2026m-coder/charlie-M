import { Button } from '@/app/_components/ui/button'
import PhotoSlider from './PhotoSlider'
import Link from 'next/link'
import {  SimpleRoom } from '@/types/offers'
import Price from '@/app/_components/ui/price'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'

const RoomCard = ({ 
  item,
}: { 
  item: SimpleRoom
}) => {
  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={item.images} roomName={item.name} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <h2 className='text-xl font-medium jakarta mb-3'>{item.name}</h2>
          <RoomParamsRow attributes={item.attributes } maxPersons={item.maxPersons} size={item.size} />
          <div className='text-mute mb-5 mt-auto'>per night from</div>

        <div className='flex items-center gap-8 justify-between w-full'>
          <Price price={item.price.toFixed(2)} className='h-[50px]' />
          <Link href={`/rooms/${item.id}`} className='w-full '>  
            <Button variant='outline' className='h-[50px] w-full'>Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RoomCard