'use client'
import ExtraCard from "./ExtraCard"
import { Service } from "@/types/apaleo"
import { useAddExtrasStore } from '@/store/useAddExtras'
import { useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { isBreakfastBeverage, isBreakfastFood, makeBreakfastDisplayService } from '@/lib/breakfastBundle'
import { shouldShowCleaningService } from '@/utils/cleaningAvailability'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const EARLY_CHECKIN_DEADLINE_HOUR = 13
const LATE_CHECKOUT_DEADLINE_HOUR = 13

const AddExtras = ({ 
  extras,
  existingServices,
  adults,
  nights,
  isBabyBedAvailable,
  arrival,
  departure,
  lcoApplied,
  eciApplied
}: {
  extras: Service[],
  existingServices?: any[],
  adults: number,
  nights: number,
  isBabyBedAvailable?: boolean,
  arrival?: string,
  departure?: string,
  lcoApplied?: boolean,
  eciApplied?: boolean
}) => {
  const t = useTranslations('profile')
  const locale = useLocale()
  const setAvailableExtras = useAddExtrasStore(state => state.setAvailableExtras)

  useEffect(() => {
    // Store the RAW catalog (both breakfast halves) so pricing/booking can find
    // each id; only the standalone beverage CARD is hidden below.
    setAvailableExtras(extras)
  }, [extras, setAvailableExtras])

  if (!extras || extras.length === 0) {
    return null;
  }

  const existingServiceIds = existingServices?.map(s => s.service.id) || [];
  const breakfastBeverage = extras.find(e => isBreakfastBeverage(e.id));

  const availableExtras = extras.filter(extra => {
    // Beverage half is folded into the single Breakfast card — never shown alone.
    if (isBreakfastBeverage(extra.id)) return false;
    if (extra.id === 'CMH-ECI') {
      // Already applied (arrival already 13:00) → can't re-buy; hide it so the
      // guest doesn't pay-then-refund on a no-op amend.
      if (eciApplied) return false
      if (!arrival) return false
      const deadline = dayjs.tz(`${arrival} ${EARLY_CHECKIN_DEADLINE_HOUR}:00`, 'Europe/Berlin')
      if (!dayjs().tz('Europe/Berlin').isBefore(deadline)) return false
    }

    if (extra.id === 'CMH-LCO') {
      if (lcoApplied) return false
      if (!departure) return false
      const deadline = dayjs.tz(`${departure} ${LATE_CHECKOUT_DEADLINE_HOUR}:00`, 'Europe/Berlin')
      if (!dayjs().tz('Europe/Berlin').isBefore(deadline)) return false
    }

    if (extra.id === 'CMH-BAB' ) return isBabyBedAvailable;
    
    // For cleaning: check if all available dates are already booked
    const isCleaning = extra.id === 'CMH-CLN' || extra.name?.toLowerCase().includes('clean');
    if (isCleaning) {
      // Don't show cleaning service if stay is less than 2 nights
      if (nights < 2) {
        return false;
      }
      
      if (arrival && departure) {
        const daysOfWeek = extra.daysOfWeek || extra.availability?.daysOfWeek;
        const existingService = existingServices?.find(s => s.service.id === extra.id);
        
        return shouldShowCleaningService(
          arrival,
          departure,
          daysOfWeek,
          existingService?.dates
        );
      }
      return false;
    }
    
    if (!existingServiceIds.includes(extra.id)) return true;

    const existingService = existingServices?.find(s => s.service.id === extra.id);
    
    if (extra.availability?.mode === 'Arrival' || extra.availability?.mode === 'Departure') {
      return false;
    }
    
    const isParking = extra.id === 'CMH-PRK' || extra.id.includes('PRK');

    if (isParking) {
      // Use pre-calculated minAvailable from API
      const minAvailable = extra.minAvailable || 0;
      const existingCount = existingService?.count || 0;
      
      return minAvailable > existingCount;
    }

    if (extra.unlimited && 
        extra.availability?.mode === 'Daily' && 
        extra.pricingUnit === 'Room') {
      return false;
    }

    if (extra.availability?.mode === 'Daily' && extra.pricingUnit === 'Person') {
      const existingDates = existingService?.dates || [];
      const maxExistingCount = existingDates.length > 0 
        ? Math.max(...existingDates.map((d: any) => d.count || 0))
        : 0;
      
      if (maxExistingCount >= adults) {
        return false;
      }
      
      return true;
    }

    if (!extra.unlimited && 
        extra.availability?.mode === 'Daily' && 
        extra.pricingUnit === 'Room') {
      
      const isBabyBed = extra.id === 'CMH-BAB';
      
      if (isBabyBed) {
        if (existingService) {
          return false;
        }
        return true;
      }
      
      const existingDates = existingService?.dates || [];
      const existingDateStrings = existingDates.map((d: any) => d.serviceDate);
      const availableDates = extra.timeSlices?.slice(0, -1) || [];
        
      const hasAvailableDates = availableDates.some(timeSlice => 
        !existingDateStrings.includes(timeSlice.serviceDate)
      );
      
      if (!hasAvailableDates) {
        return false;
      }
      
      return true;
    }

    return true;
  });

  if (availableExtras.length === 0) {
    return null;
  }

  return (
    <div >
      <div className='flex items-center gap-2  pb-2 mb-5 text-lg font-semibold w-full'>
        {t('upgradeYourStay')}
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6 gap-y-3 lg:gap-y-10 mb-5'>
        {availableExtras.map((extra) => {
          const existingService = existingServices?.find(s => s.service.id === extra.id);
          const existingDates = existingService?.dates || [];
          const maxExistingCount = existingDates.length > 0
            ? Math.max(...existingDates.map((d: any) => d.count || 0))
            : 0;
          const existingDateStrings = existingDates.map((d: any) => d.serviceDate);

          // Breakfast is shown as one "Breakfast" card that books both VAT halves.
          const isBreakfast = isBreakfastFood(extra.id) && !!breakfastBeverage;
          const item = isBreakfast ? makeBreakfastDisplayService(extra, breakfastBeverage!, locale) : extra;
          const bundleServices = isBreakfast ? [extra, breakfastBeverage!] : undefined;

          return (
            <ExtraCard
              key={extra.id}
              item={item}
              adults={adults}
              nights={nights}
              existingCount={maxExistingCount}
              existingDates={existingDateStrings}
              existingDatesWithCount={existingDates}
              arrival={arrival}
              departure={departure}
              bundleServices={bundleServices}
            />
          );
        })}
      </div>
    </div>
  )
}

export default AddExtras
