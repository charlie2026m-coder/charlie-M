'use client'
import ExtraCard from './ExtraCard'
import { Service } from '@/types/apaleo'
import { useBookingStore } from '@/store/useBookingStore'
import { useTranslations } from 'next-intl'

const ExtrasSection = ({ extras, nights }: { extras: Service[] | undefined, nights: number }) => {
  const t = useTranslations('bookingForm')
  const rooms = useBookingStore(state => state.rooms);
  
  if(!extras || extras.length === 0) return null;
  const visibleExtras = extras.filter(extra => {
    if (extra.id === 'CMH-BAB') return false;
    const isCleaning = extra.id === 'CMH-CLN' || extra.name?.toLowerCase().includes('clean');
    if (isCleaning && nights < 2) return false;
    const isTest = extra.name?.toLowerCase().includes('тест') || extra.name?.toLowerCase().includes('test') || extra.id?.toLowerCase().includes('test');
    if (isTest) return false;
    return true;
  })
  
  if(visibleExtras.length === 0) return null;
  
  return (  
    <div className='flex flex-col gap-[26px] mb-10'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>{t('addExtras')}</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 gap-y-10'>
        {visibleExtras.map((extra) => (
          <ExtraCard key={extra.id} item={extra} rooms={rooms} nights={nights} />
        ))}
      </div>
    </div>
  )
}

export default ExtrasSection;
