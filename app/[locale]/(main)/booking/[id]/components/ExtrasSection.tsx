'use client'
import ExtraCard from './ExtraCard'
import { Service } from '@/types/apaleo'
import { useBookingStore } from '@/store/useBookingStore'
import { useTranslations, useLocale } from 'next-intl'
import { isBreakfastBeverage, isBreakfastFood, makeBreakfastDisplayService } from '@/lib/breakfastBundle'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const EARLY_CHECKIN_DEADLINE_HOUR = 13

const ExtrasSection = ({ extras, nights, arrival }: { extras: Service[] | undefined, nights: number, arrival: string }) => {
  const t = useTranslations('bookingForm')
  const locale = useLocale()
  const rooms = useBookingStore(state => state.rooms);

  if(!extras || extras.length === 0) return null;
  // The beverage half of breakfast is folded into the single "Breakfast" card,
  // so guests can never book it (or the food half) on its own.
  const breakfastBeverage = extras.find(extra => isBreakfastBeverage(extra.id));
  const visibleExtras = extras.filter(extra => {
    if (isBreakfastBeverage(extra.id)) return false;
    if (extra.id === 'CMH-BAB') return false;
    const isCleaning = extra.id === 'CMH-CLN' || extra.name?.toLowerCase().includes('clean');
    if (isCleaning && nights < 2) return false;
    const isTest = extra.name?.toLowerCase().includes('тест') || extra.name?.toLowerCase().includes('test') || extra.id?.toLowerCase().includes('test');
    if (isTest) return false;
    if (extra.id === 'CMH-ECI') {
      const deadline = dayjs.tz(`${arrival} ${EARLY_CHECKIN_DEADLINE_HOUR}:00`, 'Europe/Berlin')
      return dayjs().tz('Europe/Berlin').isBefore(deadline)
    }
    return true;
  })

  if(visibleExtras.length === 0) return null;

  return (
    <div className='flex flex-col gap-[26px] mb-10'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>{t('addExtras')}</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 gap-y-10'>
        {visibleExtras.map((extra) => {
          const isBreakfast = isBreakfastFood(extra.id) && !!breakfastBeverage;
          const item = isBreakfast ? makeBreakfastDisplayService(extra, breakfastBeverage!, locale) : extra;
          const bundleServices = isBreakfast ? [extra, breakfastBeverage!] : undefined;
          return (
            <ExtraCard key={extra.id} item={item} rooms={rooms} nights={nights} bundleServices={bundleServices} />
          );
        })}
      </div>
    </div>
  )
}

export default ExtrasSection;
