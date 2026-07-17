'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/app/_components/ui/dialog"
import { Button } from "@/app/_components/ui/button";
import { useState } from "react";
import { Service } from "@/types/apaleo";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useAddExtrasStore } from "@/store/useAddExtras";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { isStayExtensionService } from "@/lib/extrasPrice";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { getExtraImage } from "@/lib/getExtraImage";
  
const AddCheckoutExtra = ({ extra, adults, nights, existingCount = 0 }: { extra: Service, adults: number, nights: number, existingCount?: number }) => {
  const t = useTranslations('profile');
  const [isOpen, setIsOpen] = useState(false);
  const services = useAddExtrasStore(state => state.services);
  const addService = useAddExtrasStore(state => state.addService);
  const removeService = useAddExtrasStore(state => state.removeService);
  
  const mode = extra.availability?.mode;
  const pricingUnit = extra.pricingUnit;
  const isBabyBed = extra.id === 'CMH-BAB';
  const isParking = extra.id === 'CMH-PRK' || extra.id.includes('PRK');
  
  const timeSlice = mode === 'Arrival' 
    ? extra.timeSlices?.[0] 
    : extra.timeSlices?.[extra.timeSlices.length - 1];
  
  const checkAvailability = () => {
    if (isBabyBed) {
      // Don't slice for baby bed - check ALL dates
      const allTimeSlices = extra.timeSlices || [];
      // Check if ALL dates have availableCount > 0
      const allAvailable = allTimeSlices.every(ts => ts.availableCount > 0);
      if (!allAvailable) return 0;
      
      // Return minimum available count across all dates
      const minAvailable = Math.min(...allTimeSlices.map(ts => ts.availableCount));
      return Math.max(0, minAvailable);
    }
    
    if (isParking) {
      // Use pre-calculated minAvailable from API
      return extra.minAvailable || 0;
    }
    
    return timeSlice?.availableCount || 0;
  };
  
  const availableCount = checkAvailability();
  
  const getMaxLimit = () => {
    if (availableCount <= 0) return 0;

    // LCO/ECI are a single reservation amend (one time change) — cap at 1
    // regardless of the catalog pricingUnit, so a 2-guest stay can't be charged
    // the fee twice for one late check-out.
    if (isStayExtensionService(extra.id)) return Math.min(1, availableCount);

    if (pricingUnit === 'Room') {
      return Math.min(1, availableCount);
    }
    if (pricingUnit === 'Person') {
      const remainingGuests = adults - existingCount;
      return Math.min(remainingGuests, availableCount);
    }
    return availableCount;
  };
  
  const maxLimit = getMaxLimit();
  
  const savedService = services.find(s => s.serviceId === extra.id);
  const [count, setCount] = useState(savedService?.count || 0);

  const getTotalPrice = () => {
    if (isBabyBed) {
      // One-time fee for the whole stay (matches the booking flow + validator).
      return extra.price * count;
    }
    if (isParking) {
      return extra.price * count * nights;
    }
    return extra.price * count;
  };

  const add = () => {
    if (count >= maxLimit) return;
    setCount(count + 1);
  };

  const subtract = () => {
    if (count <= 0) return;
    setCount(count - 1);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const savedService = services.find(s => s.serviceId === extra.id);
      setCount(savedService?.count || 0);
    }
  };

  const handleConfirm = () => {
    if (count === 0) {
      removeService(extra.id);
      setIsOpen(false);
      return;
    }

    if (isBabyBed) {
      addService({
        serviceId: extra.id,
      });
    } else {
      addService({
        serviceId: extra.id,
        count: count,
        price: extra.price,
      });
    }
    
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className='w-full h-[35px] border border-dark-gold text-dark-gold rounded-[7px] px-2.5 text-center cursor-pointer hover:bg-light-bg transition-colors text-[17px] font-[550]'>
          +{t('add')}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle className='font-semibold text-xl'>
            {t('addExtra', { name: `${extra.name} (€${extra.price})` })}
          </DialogTitle>
        </DialogHeader>
        {/* Service photo (desktop) — ties the dialog to the card the guest clicked */}
        <div className="hidden sm:block relative w-full h-[150px] shrink-0 rounded-xl overflow-hidden">
          <Image src={getExtraImage(extra.id, extra.name, extra.imageUrl)} alt={extra.name} fill className="object-cover" />
        </div>

        <div className='flex flex-col gap-5  pb-5 border-t pt-10'>
          <div className='flex items-center justify-between gap-2 overflow-hidden'>
            <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
              <span className={cn('font-bold truncate', availableCount === 0 && 'line-through text-gray')}>
                {isBabyBed || isParking ? t('allNights') : (timeSlice ? dayjs(timeSlice.serviceDate).format('ddd DD MMM') : mode)}
              </span>
              {availableCount === 0 
                ? <span className="text-gray text-sm truncate">{t('soldOut')}</span>
                : <span className="text-gray text-sm truncate">({availableCount} {t('available')})</span>
              }
            </div>

            <div className="flex items-center gap-2">
              <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0 || availableCount === 0} />
              <span className="font-semibold min-w-[20px] text-center">
                {count}
              </span>
              <ButtonIcon onClick={add} symbol='+' disabled={count >= maxLimit || availableCount === 0} />
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between pt-5'>
          <span>{t('total')} {count}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            {t('confirm')} <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCheckoutExtra;
