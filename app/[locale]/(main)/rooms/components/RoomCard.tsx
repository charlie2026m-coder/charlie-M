'use client'
import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/[locale]/_home/components/PhotoSlider'
import { Link, useRouter } from '@/navigation'
import { getPath, getDate } from '@/lib/utils'
import { UrlParams } from '@/types/apaleo'
import { RoomOffer } from '@/types/offers'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useStore } from '@/store/useStore'

import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import Price from '@/app/_components/ui/price'

const RoomCard = ({ 
  params,
  room, 
}: { 
  params: UrlParams,
  room: RoomOffer
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('roomCard');
  const tParams = useTranslations('roomParams');
  const { dateRange, guests } = useStore();

  // Priority: 1. params from URL, 2. store
  const getQueryParams = () => {
    const from = params.from || (dateRange.from ? getDate(dateRange.from) : undefined);
    const to = params.to || (dateRange.to ? getDate(dateRange.to) : undefined);
    const adults = params.adults || guests.adults.toString();
    const children = params.children || guests.children.toString();

    return { from, to, adults, children };
  };

  const queryParams = getQueryParams();
  const queryString = getPath(queryParams);
  
  const adultsCount = Number(queryParams.adults || 1);
  const childrenCount = Number(queryParams.children || 0);
  const maxPersons = room.maxPersons || 2; // Use room's maxPersons
  
  const roomsForChildren = childrenCount;
  
  const minAdultsForChildren = childrenCount;
  const adultsAssignedToChildren = Math.min(adultsCount, minAdultsForChildren);
  
  let remainingAdults = adultsCount - adultsAssignedToChildren;
  
  const maxAdultsPerChildRoom = Math.min(maxPersons, 2); // Can't exceed room capacity
  const additionalAdultsCapacity = childrenCount * (maxAdultsPerChildRoom - 1);
  const additionalAdultsAssigned = Math.min(remainingAdults, additionalAdultsCapacity);
  remainingAdults -= additionalAdultsAssigned;
  
  const roomsForRemainingAdults = Math.ceil(remainingAdults / maxPersons);
  
  const roomsNeeded = roomsForChildren + roomsForRemainingAdults;
  
  const pricePerNight = adultsCount >= maxPersons 
    ? (room.oneNightPriceForTwo || room.oneNightPrice || 0)
    : (room.oneNightPrice || 0);
  const price = roomsNeeded * pricePerNight;
  
  const roomDetailId = room.unitGroup.id;

  const handleBookNow = () => {
    setIsLoading(true);
    router.push(`/rooms/${roomDetailId}?${queryString}`);
  };

  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={room.images} roomName={room.name} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <Link href={`/rooms/${roomDetailId}?${queryString}`}>
          <h2 className='text-xl font-medium jakarta mb-3 hover:text-blue transition-colors cursor-pointer'>{roomsNeeded > 1 ? `${roomsNeeded} X ` : ''}{room.name}</h2>
        </Link>
        <RoomParamsRow 
          attributes={room.attributes} 
          maxPersons={room.maxPersons} 
          size={room.size} 
          translations={{
            max: tParams('max'),
            kingSize: tParams('kingSize'),
            queenSize: tParams('queenSize'),
            single: tParams('single'),
            balcony: tParams('balcony'),
            terrace: tParams('terrace'),
          }}
        />
        <div className='text-mute mb-5 mt-auto'>{t('perNightFrom')}</div>

        <div className='flex xxs:flex-row flex-col items-center gap-2 md:gap-8 justify-between w-full'>
          <Price price={price} className='h-[50px] w-full xs:w-auto' />
          <Button 
            onClick={handleBookNow}
            disabled={isLoading}
            variant='outline' 
            className='h-[50px] active:bg-black active:text-white'
          >
            {isLoading ? t('loading') : t('bookNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RoomCard