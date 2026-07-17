'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/app/_components/ui/dialog"
import { Button } from "@/app/_components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { AvailabilityServiceItem, Service } from "@/types/apaleo";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useAddExtrasStore } from "@/store/useAddExtras";
import dayjs from "dayjs";
import { useTranslations } from 'next-intl';
import { createCleaningDatesArray, CleaningDateItem } from '@/utils/cleaningAvailability';
import Image from "next/image";
import { getExtraImage } from "@/lib/getExtraImage";

const AddCleaningExtra = ({ extra, existingDatesWithCount = [], arrival, departure }: { extra: Service, existingDatesWithCount?: any[], arrival?: string, departure?: string }) => {
  const t = useTranslations('profile');
  const [isOpen, setIsOpen] = useState(false);
  const allServices = useAddExtrasStore(state => state.services);
  const addService = useAddExtrasStore(state => state.addService);
  const removeService = useAddExtrasStore(state => state.removeService);
  const savedDates = allServices.find(s => s.serviceId === extra.id)?.dates || [];
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>({});
  
  const maxCount = 1;

  // Create complete array of dates with isExisting flag using utility function
  const allCleaningDates = useMemo(() => {
    
    if (!arrival || !departure) {
      console.log('🧹 [AddCleaningExtra] No arrival/departure dates provided');
      return [];
    }
    
    const daysOfWeek = extra.daysOfWeek || extra.availability?.daysOfWeek;
    const dates = createCleaningDatesArray(
      arrival,
      departure,
      daysOfWeek,
      existingDatesWithCount,
      extra.price,
      extra.currency
    );
    
    return dates;
  }, [arrival, departure, extra.daysOfWeek, extra.availability?.daysOfWeek, existingDatesWithCount, extra.price, extra.currency]);

  // Filter out existing dates - only show dates available for booking (count = 0)
  const selectableDates = useMemo(() => {
    return allCleaningDates.filter(item => item.count === 0);
  }, [allCleaningDates]);

  useEffect(()=>{
    const initValues: { [date: string]: number } = {};
    
    // Initialize only selectable dates with 0
    selectableDates.forEach(item => {
      const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
      initValues[formattedDate] = 0;
    });
    
    // Override with saved dates from store (new selections)
    savedDates.forEach(item => {
      const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
      if (initValues.hasOwnProperty(formattedDate)) {
        initValues[formattedDate] = item.count || 0;
      }
    });
    
    setDailyCounts(initValues);
  }, [savedDates.length, selectableDates.length])


  const handleConfirm = () => {
    console.log('🧹 [AddCleaningExtra] Confirming with dailyCounts:', dailyCounts);
    console.log('🧹 [AddCleaningExtra] All cleaning dates:', allCleaningDates);
    
    // Create a map to merge existing and new dates
    const allDatesMap = new Map<string, any>();
    
    // Add all dates from allCleaningDates (includes existing with isExisting: true)
    allCleaningDates.forEach(item => {
      allDatesMap.set(item.serviceDate, {
        serviceDate: item.serviceDate,
        count: item.count,
        amount: item.amount,
        isExisting: item.isExisting
      });
    });
    
    console.log('🧹 [AddCleaningExtra] After adding all dates:', Array.from(allDatesMap.entries()));
    
    // Add/update with new selections
    Object.entries(dailyCounts).forEach(([date, count]) => {
      if (count > 0) {
        allDatesMap.set(date, {
          serviceDate: date,
          count: 1,
          amount: {
            amount: extra.price,
            currency: extra.currency || 'EUR'
          },
          isExisting: false // Flag to mark new bookings
        });
      }
    });
    
    console.log('🧹 [AddCleaningExtra] After adding new selections:', Array.from(allDatesMap.entries()));
    
    // Convert map to array and filter out dates with count = 0
    const finalDates = Array.from(allDatesMap.values()).filter(d => d.count > 0);
    
    console.log('🧹 [AddCleaningExtra] Final dates to save:', finalDates);

    if (finalDates.length === 0) {
      console.log('🧹 [AddCleaningExtra] No dates selected, removing service');
      removeService(extra.id);
    } else {
      const serviceToAdd = {
        serviceId: extra.id,
        dates: finalDates,
      };
      console.log('🧹 [AddCleaningExtra] Saving cleaning service to store:', serviceToAdd);
      addService(serviceToAdd);
    }
    
    setIsOpen(false);
  };

  const selectAll = () => {
    const newCounts: { [date: string]: number } = {};
    selectableDates.forEach(item => {
      const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
      newCounts[formattedDate] = maxCount;
    });
    setDailyCounts(newCounts);
  };

  const handleDayCountChange = (date: string, newCount: number) => {
    setDailyCounts(prev => ({ ...prev, [date]: newCount }));
  };

  const getTotalPrice = () => {
    const selectedDaysCount = Object.values(dailyCounts).filter(count => count > 0).length;
    return selectedDaysCount * extra.price;
  };

  const getTotalCount = () => {
    return Object.values(dailyCounts).filter(count => count > 0).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className='w-full h-[35px] border border-dark-gold text-dark-gold rounded-[7px] px-2.5 text-center cursor-pointer hover:bg-light-bg transition-colors text-[17px] font-[550]'>
          +{t('add')}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className='font-semibold text-xl'>
            {t('addExtra', { name: extra.name })} (€{extra.price})
          </DialogTitle>
        </DialogHeader>
        {/* Service photo (desktop) — ties the dialog to the card the guest clicked */}
        <div className="hidden sm:block relative w-full h-[150px] shrink-0 rounded-xl overflow-hidden">
          <Image src={getExtraImage(extra.id, extra.name, extra.imageUrl)} alt={extra.name} fill className="object-cover" />
        </div>

        <div className='py-2.5 border-b border-t flex items-center gap-4 min-w-0'>
          <div className='text-lg font-semibold truncate min-w-0 flex-1'>{t('selectDates')}</div>
          <Button variant="outline" className='h-[45px] flex-shrink-0 whitespace-nowrap' onClick={selectAll}>
            {t('selectAllAvailable')}
          </Button>
        </div>

        <div className='flex flex-col gap-5 pt-2.5 pb-5 max-h-[400px] overflow-y-auto overflow-x-hidden min-w-0'>
          {selectableDates.map(item => {
            const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
            return (
              <DayRow 
                key={item.serviceDate} 
                item={item} 
                count={dailyCounts[formattedDate] || 0}
                onCountChange={handleDayCountChange}
                maxCount={maxCount}
                t={t}
              />
            );
          })}
        </div>

        <div className='flex items-center justify-between pt-5 min-w-0 gap-4'>
          <span className='truncate min-w-0'>{t('total')}: {getTotalCount()}</span>
          <Button onClick={handleConfirm} className='h-[45px] flex-shrink-0'>
            {t('confirm')} <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCleaningExtra;

const DayRow = ({ 
  item, 
  count, 
  onCountChange,
  maxCount,
  t
}: { 
  item: CleaningDateItem, 
  count: number, 
  onCountChange: (date: string, count: number) => void,
  maxCount: number,
  t: any
}) => {
  const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
  const isPast = dayjs(item.serviceDate).isBefore(dayjs().startOf('day'));

  const add = () => {
    if (count >= maxCount || isPast) return;
    onCountChange(formattedDate, count + 1);
  };

  const subtract = () => {
    if (count <= 0) return;
    onCountChange(formattedDate, count - 1);
  };

  return (
    <div className='flex items-center justify-between gap-2 overflow-hidden'>
      <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
        <span className={`font-bold truncate ${isPast ? 'line-through text-gray' : ''}`}>
          {dayjs(item.serviceDate).format('ddd DD MMM')}
        </span>
        {isPast && <span className="text-gray text-sm truncate">{t('past')}</span>}
      </div>

      <div className="flex items-center gap-2">
        <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0} />
        <span className="font-semibold min-w-[20px] text-center">{count}</span>
        <ButtonIcon onClick={add} symbol='+' disabled={count >= maxCount || isPast} />
      </div>
    </div>
  );
};
