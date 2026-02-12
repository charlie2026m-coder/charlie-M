'use client'
import ExtraCard from "./ExtraCard"
import { Service } from "@/types/apaleo"
import { useAddExtrasStore } from '@/store/useAddExtras'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { shouldShowCleaningService } from '@/utils/cleaningAvailability'

const AddExtras = ({ 
  extras,
  existingServices,
  adults,
  nights,
  isBabyBedAvailable,
  arrival,
  departure
}: { 
  extras: Service[],
  existingServices?: any[],
  adults: number,
  nights: number,
  isBabyBedAvailable?: boolean,
  arrival?: string,
  departure?: string
}) => {
  const t = useTranslations('profile')
  const setAvailableExtras = useAddExtrasStore(state => state.setAvailableExtras)
  
  useEffect(() => {
    setAvailableExtras(extras)
  }, [extras, setAvailableExtras])
  
  if (!extras || extras.length === 0) {
    return null;
  }

  const existingServiceIds = existingServices?.map(s => s.service.id) || [];

  const availableExtras = extras.filter(extra => {
    if (extra.id === 'CMH-ECI') {
      return false;
    }
    
    if (extra.id === 'CMH-BAB' ) return isBabyBedAvailable;
    
    // For cleaning: check if all available dates are already booked
    const isCleaning = extra.id === 'CMH-CLN' || extra.name?.toLowerCase().includes('clean');
    if (isCleaning && arrival && departure) {
      const daysOfWeek = extra.daysOfWeek || extra.availability?.daysOfWeek;
      const existingService = existingServices?.find(s => s.service.id === extra.id);
      
      return shouldShowCleaningService(
        arrival,
        departure,
        daysOfWeek,
        existingService?.dates
      );
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
          
          return (
            <ExtraCard 
              key={extra.id} 
              item={extra}
              adults={adults}
              nights={nights}
              existingCount={maxExistingCount}
              existingDates={existingDateStrings}
              existingDatesWithCount={existingDates}
              arrival={arrival}
              departure={departure}
            />
          );
        })}
      </div>
    </div>
  )
}

export default AddExtras
