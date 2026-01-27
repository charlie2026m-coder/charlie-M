'use client'
import ExtraCard from './ExtraCard'
import { Service } from '@/types/apaleo'
import { RoomOffer } from '@/types/offers'
const ExtrasSection = ({ extras, room, guests, rooms, nights }: { extras: Service[] | undefined, room: RoomOffer, guests: number, rooms: RoomOffer[], nights: number }) => {
  if(!extras || extras.length === 0) return null;

  return (  
    <div className='flex flex-col gap-[26px] mb-10'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>Add Extras:</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 gap-y-10'>
        {extras.map((extra) => (
          <ExtraCard key={extra.id} item={extra} room={room} guests={guests} rooms={rooms} nights={nights} />
        ))}
      </div>
    </div>
  )
}

export default ExtrasSection;
