'use client'
import { Button } from '@/app/_components/ui/button'
import PhotoSlider from './PhotoSlider'
import { Link, useRouter } from '@/navigation'
import {  RoomOffer } from '@/types/offers'
import Price from '@/app/_components/ui/price'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import { useStore } from '@/store/useStore'
import { getDate, getPath } from '@/lib/utils'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

const RoomCard = ({ 
  item,
}: { 
  item: RoomOffer
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const dateRange = useStore(state => state.dateRange);
  const guests = useStore(state => state.guests);
  const t = useTranslations('roomCard');

  // Build query string from Zustand state
  const queryString = getPath({ 
    from: dateRange.from ? getDate(dateRange.from) : undefined, 
    to: dateRange.to ? getDate(dateRange.to) : undefined, 
    adults: guests.adults.toString(), 
    children: guests.children.toString() 
  });

  const handleBookNow = () => {
    setIsLoading(true);
    router.push(`/rooms/${item.unitGroup.id}?${queryString}`);
  };

  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={item.images} roomName={item.name} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <Link href={`/rooms/${item.unitGroup.id}?${queryString}`}>
          <h2 className='text-xl font-medium jakarta mb-3 hover:text-blue transition-colors cursor-pointer'>{item.name}</h2>
        </Link>
          <RoomParamsRow attributes={item.attributes } maxPersons={item.maxPersons} size={item.size} />
          <div className='text-mute mb-5 mt-auto'>{t('perNightFrom')}</div>

        <div className='flex xxs:flex-row flex-col items-center gap-2 md:gap-8 justify-between w-full'>
          <Price price={item.oneNightPrice || 0} className='h-[50px] w-full xs:w-auto' />
          <Button 
            onClick={handleBookNow}
            disabled={isLoading}
            variant='outline' 
            className='h-[50px]  hover:bg-mute hover:text-white active:bg-mute active:text-white'
          >
            {isLoading ? t('loading') : t('bookNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RoomCard