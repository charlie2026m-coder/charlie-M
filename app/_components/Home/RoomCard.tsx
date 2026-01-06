import { Button } from '../ui/button'
import PhotoSlider from './PhotoSlider'
import Link from 'next/link'
import {  SimpleRoom } from '@/types/offers'
import Price from '../ui/price'
import RoomParamsRow from '../ui/RoomParamsRow'

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
        <div className='flex items-center justify-between mb-4  mt-auto'>
          <div className='text-brown '>per night from</div>
          <Price price={item.price.toFixed(2)} />
        </div>

        <div className='flex items-center  lg:flex-col xl:flex-row justify-between w-full'>
          <Link href={`/rooms/${item.id}`} className='w-full '>  
            <Button className='h-[55px] w-full '>Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RoomCard