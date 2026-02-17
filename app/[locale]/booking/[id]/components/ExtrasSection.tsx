'use client'
import ExtraCard from './ExtraCard'
import { Service } from '@/types/apaleo'
import { RoomOffer } from '@/types/offers'
import { useBookingStore } from '@/store/useBookingStore'
import { useTranslations } from 'next-intl'

const ExtrasSection = ({ extras, room, nights, children }: { extras: Service[] | undefined, room: RoomOffer, nights: number, children?: number }) => {
  const t = useTranslations('bookingForm')
  const rooms = useBookingStore(state => state.rooms);
  const guests = rooms.reduce((acc, room) => acc + room.adults, 0);
  const totalChildren = children !== undefined ? children : rooms.reduce((acc, room) => acc + (room.children || 0), 0);
  
  if(!extras || extras.length === 0) return null;
  // Filter out baby bed (CMH-BAB) - it's added automatically based on children count
  // Filter out cleaning service if stay is less than 2 nights
  const visibleExtras = extras.filter(extra => {
    if (extra.id === 'CMH-BAB') return false;
    const isCleaning = extra.id === 'CMH-CLN' || extra.name?.toLowerCase().includes('clean');
    if (isCleaning && nights < 2) return false;
    return true;
  })
  
  if(visibleExtras.length === 0) return null;
  
  return (  
    <div className='flex flex-col gap-[26px] mb-10'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>{t('addExtras')}</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 gap-y-10'>
        {visibleExtras.map((extra) => (
          <ExtraCard key={extra.id} item={extra} room={room} guests={guests} children={totalChildren} rooms={rooms} nights={nights} />
        ))}
      </div>
    </div>
  )
}

export default ExtrasSection;
