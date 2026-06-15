'use client'
import { Button } from '@/app/_components/ui/button'
import PhotoSlider from './PhotoSlider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HomeRoomCard } from '@/types/offers'
import Price from '@/app/_components/ui/price'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import { useStore } from '@/store/useStore'
import { getDate, getPath } from '@/lib/utils'
import { useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
const RoomCard = ({
  item,
  locale,
  translations,
}: {
  item: HomeRoomCard
  locale: string
  translations: {
    perNightFrom: string
    loading: string
    bookNow: string
    booked?: string
    nextAvailable?: string
    roomParams: {
      max: string
      kingSize: string
      queenSize: string
      single: string
      balcony: string
      terrace: string
    }
  }
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const dateRange = useStore(state => state.dateRange);
  const guests = useStore(state => state.guests);

  // Prefer this card's own nearest bookable night (the home showcase computes
  // it server-side); fall back to any range in the store. Book Now lands on the
  // room page with those dates prefilled.
  const fromStr = item.arrival ?? (dateRange.from ? getDate(dateRange.from) : undefined);
  const toStr = item.departure ?? (dateRange.to ? getDate(dateRange.to) : undefined);

  const queryString = getPath({
    from: fromStr,
    to: toStr,
    adults: guests.adults.toString(),
    children: guests.children.toString(),
  });

  // Compact, localized nearest-night label, e.g. "16–17 Jun" / "30 Jun – 1 Jul".
  const nearestLabel = (() => {
    if (!item.arrival || !item.departure) return null;
    const fmt = (iso: string, withMonth: boolean) => {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        day: 'numeric',
        ...(withMonth ? { month: 'short' } : {}),
      }).format(date);
    };
    const sameMonth = item.arrival.slice(0, 7) === item.departure.slice(0, 7);
    return sameMonth
      ? `${fmt(item.arrival, false)}–${fmt(item.departure, true)}`
      : `${fmt(item.arrival, true)} – ${fmt(item.departure, true)}`;
  })();

  const handleBookNow = () => {
    setIsLoading(true);
    router.push(`/${locale}/rooms/${item.unitGroup.id}?${queryString}`);
  };

  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider
        height={260}
        images={item.images}
        roomName={item.name}
        onNavigate={() => router.push(`/${locale}/rooms/${item.unitGroup.id}?${queryString}`)}
      />
      {/* All cards are equal height (h-full fills the carousel row). The rows
          below follow a fixed vertical pattern — clamped 2-line name, a
          reserved "Next available" row, then the price/action pinned to the
          bottom (mt-auto) — so those elements line up across cards regardless
          of name length or whether a price is shown. */}
      <div className='flex flex-col p-4 pb-5 sm:pb-6 h-full'>
        <Link href={`/${locale}/rooms/${item.unitGroup.id}?${queryString}`}>
          <h2 className='text-xl font-medium jakarta mb-2 line-clamp-2 min-h-[3.5rem] hover:text-blue transition-colors cursor-pointer'>{item.name}</h2>
        </Link>
        <RoomParamsRow attributes={item.attributes } maxPersons={item.maxPersons} size={item.size} translations={translations.roomParams} />
        {/* Always reserve this row's height so the line sits at the same place
            on every card, present or not. */}
        <div className='flex items-center gap-1.5 text-sm text-blue font-medium min-h-[1.5rem]'>
          {nearestLabel && (
            <>
              <FiCalendar className='size-4 shrink-0' />
              <span>{translations.nextAvailable ?? 'Next available'}: {nearestLabel}</span>
            </>
          )}
        </div>

        <div className='mt-auto pt-4'>
          {item.oneNightPrice > 0 && (
            <div className='text-mute mb-2 sm:mb-3'>{translations.perNightFrom}</div>
          )}
          {item.isBooked
            ? <div className='text-sm font-medium text-gray-400 px-2 py-3'>
                {translations.booked ?? 'Not available for these dates'}
              </div>
            : <div className='flex xxs:flex-row flex-col items-center gap-2 md:gap-8 justify-between w-full'>
                {item.oneNightPrice > 0 && (
                  <Price price={item.oneNightPrice} className='h-[50px] w-full xs:w-auto' />
                )}
                <Button
                  onClick={handleBookNow}
                  disabled={isLoading}
                  variant='outline'
                  className='h-[50px] hover:bg-mute hover:text-white active:bg-mute active:text-white'
                >
                  {isLoading ? translations.loading : translations.bookNow}
                </Button>
              </div>
          }
        </div>
      </div>
    </div>
  )
}

export default RoomCard