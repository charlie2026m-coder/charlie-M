'use client'
import { FaPlus } from "react-icons/fa6";
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
  
const AddCheckoutExtra = ({ extra, adults, existingCount = 0 }: { extra: Service, adults: number, nights: number, existingCount?: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const services = useAddExtrasStore(state => state.services);
  const addService = useAddExtrasStore(state => state.addService);
  const removeService = useAddExtrasStore(state => state.removeService);
  
  const mode = extra.availability?.mode;
  const pricingUnit = extra.pricingUnit;
  const isBabyBed = extra.id === 'CMH-BAB';
  
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
    return timeSlice?.availableCount || 0;
  };
  
  const availableCount = checkAvailability();
  
  const getMaxLimit = () => {
    if (availableCount <= 0) return 0;
    
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
      const allTimeSlices = extra.timeSlices?.slice(0, -1) || [];
      return extra.price * count * allTimeSlices.length;
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
        <div className='absolute flex top-2.5 right-2.5 items-center justify-center rounded transition-all duration-300 cursor-pointer size-10 shadow-lg bg-blue border-blue text-white'>
          <FaPlus className='size-6' />
        </div>
      </DialogTrigger>
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle className='font-semibold text-xl'>
            Add {extra.name} (€{extra.price})
          </DialogTitle>
        </DialogHeader>


        <div className='flex flex-col gap-5  pb-5 border-t pt-10'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className={cn('font-bold', availableCount === 0 && 'line-through text-gray')}>
                {isBabyBed ? 'All nights' : (timeSlice ? dayjs(timeSlice.serviceDate).format('ddd DD MMM') : mode)}
              </span>
              {availableCount === 0 
                ? <span className="text-gray text-sm">Sold Out</span>
                : <span className="text-gray text-sm">({availableCount} available)</span>
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
          <span>Total: {count} {extra.name}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            Confirm <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCheckoutExtra;
