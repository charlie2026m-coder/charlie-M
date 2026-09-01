'use client'
import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/[locale]/_home/components/PhotoSlider'
import { Link, useRouter } from '@/navigation'
import { getPath, getDate, calculateNights } from '@/lib/utils'
import { UrlParams } from '@/types/apaleo'
import { RoomOffer } from '@/types/offers'
import { useTranslations } from 'next-intl'
import { useStore } from '@/store/useStore'

import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import Price from '@/app/_components/ui/price'
import { GoogleRatingBadge, UnitsLeftBadge } from '@/app/_components/ui/CardBadges'
import { trackSelectItem } from '@/lib/analytics'

const RoomCard = ({ 
  params,
  room, 
}: { 
  params: UrlParams,
  room: RoomOffer
}) => {
  const router = useRouter();
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
  
  const nights = queryParams.from && queryParams.to
    ? calculateNights(queryParams.from, queryParams.to)
    : 1;

  const pricePerNight = adultsCount >= maxPersons
    ? (room.oneNightPriceForTwo || room.oneNightPrice || 0)
    : (room.oneNightPrice || 0);
  const price = roomsNeeded * pricePerNight * nights;
  
  const roomDetailId = room.unitGroup.id;

  // GA4 select_item — this card was chosen from the dated list.
  const fireSelect = () => trackSelectItem({ roomId: roomDetailId, roomName: room.name });

  const handleBookNow = () => {
    fireSelect();
    router.push(`/rooms/${roomDetailId}?${queryString}`);
  };

  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full transition-transform duration-300 ease-out lg:hover:scale-[1.02]'>
      <PhotoSlider
        height={260}
        images={room.images}
        roomName={room.name}
        onNavigate={() => { fireSelect(); router.push(`/rooms/${roomDetailId}?${queryString}`) }}
      />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <Link href={`/rooms/${roomDetailId}?${queryString}`} onClick={fireSelect}>
          <h2 className='text-xl font-medium jakarta mb-1.5 hover:text-blue transition-colors cursor-pointer'>{roomsNeeded > 1 ? `${roomsNeeded} X ` : ''}{room.name}</h2>
        </Link>
        {/* Trust first, then scarcity: the guest is comparing rooms here, and
            `availableUnits` on this offer is already scoped to their dates. */}
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2'>
          <GoogleRatingBadge />
          <UnitsLeftBadge availableUnits={room.availableUnits} />
        </div>
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
        {/* Die Zahl ist die SUMME fuer die Daten des Gastes (roomsNeeded x
            Nachtpreis x Naechte). Darueber stand "per night from" — bei zwei
            Naechten also glatt die doppelte Zahl als Nachtpreis ausgegeben.
            Erst sagen, WAS die Zahl ist, dann was schon drinsteckt. */}
        <div className='mt-auto pt-2'>
        <div className='flex xxs:flex-row flex-col items-center xxs:items-end gap-2 md:gap-8 justify-between w-full'>
          <div className='flex flex-col gap-1 min-w-0 w-full xs:w-auto'>
            <span className='text-mute text-[11px] font-medium uppercase tracking-[0.14em] whitespace-nowrap'>
              {nights === 1 ? t('nightTotal') : t('nightsTotal', { count: nights })}
            </span>
            <Price price={price} className='h-[50px] w-full xs:w-auto' />
            {/* Bewusst NICHT nowrap: die deutsche Zeile ist ~166px, diese Spalte
                kann schmaler sein, und mit sichtbarem Overflow malte der Text
                quer ueber den Book-Button. Umbruch laesst die Spalte wachsen,
                der Button bleibt auf Hoehe der letzten Zeile. */}
            <span className='text-[10px] leading-[1.35] text-mute'>{t('taxesIncluded')}</span>
          </div>
          <Button 
            onClick={handleBookNow}
            variant='outline'
            className='h-[50px] active:bg-black active:text-white'
          >
            {t('bookNow')}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default RoomCard