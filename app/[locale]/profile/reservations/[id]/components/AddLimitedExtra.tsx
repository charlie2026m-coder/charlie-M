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
import { useState, useRef, useEffect } from "react";
import { AvailabilityServiceItem, Service } from "@/types/apaleo";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useAddExtrasStore } from "@/store/useAddExtras";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const AddLimitedExtra = ({ extra, adults, nights, existingCount = 0, existingDates = [] }: { extra: Service, adults: number, nights: number, existingCount?: number, existingDates?: string[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const services = useAddExtrasStore(state => state.services);
  const addService = useAddExtrasStore(state => state.addService);
  const removeService = useAddExtrasStore(state => state.removeService);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  const availableTimeSlices = extra.timeSlices?.slice(0, -1) || [];
  
  const savedService = services.find(s => s.serviceId === extra.id);
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>(() => {
    const initialCounts: { [date: string]: number } = {};
    availableTimeSlices.forEach(item => {
      const savedDateCount = savedService?.dates?.find(d => d.serviceDate === item.serviceDate)?.count;
      initialCounts[item.serviceDate] = savedDateCount || 0;
    });
    return initialCounts;
  });

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current;
        const hasScroll = scrollHeight > clientHeight;
        const notAtBottom = scrollTop < scrollHeight - clientHeight - 10;
        setShowScrollIndicator(hasScroll && notAtBottom);
      }
    };
    
    const timer = setTimeout(checkScroll, 100);
    scrollRef.current?.addEventListener('scroll', checkScroll);
    
    return () => {
      clearTimeout(timer);
      scrollRef.current?.removeEventListener('scroll', checkScroll);
    };
  }, [isOpen, availableTimeSlices]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const handleConfirm = () => {
    const newDates = availableTimeSlices.map(item => ({
      serviceDate: dayjs(item.serviceDate).format('YYYY-MM-DD'),
      count: dailyCounts[item.serviceDate] || 0,
      amount: {
        amount: extra.price * (dailyCounts[item.serviceDate] || 0),
        currency: extra.currency || 'EUR'
      }
    })).filter(d => d.count > 0);
    
    if (newDates.length === 0) {
      removeService(extra.id);
    } else {
      addService({
        serviceId: extra.id,
        dates: newDates,
      });
    }
    
    setIsOpen(false);
  };

  const selectAll = () => {
    const newCounts: { [date: string]: number } = {};
    const isRoom = extra.pricingUnit === 'Room';
    const isPerson = extra.pricingUnit === 'Person';
    
    availableTimeSlices.forEach(item => {
      const isOccupied = existingDates.includes(item.serviceDate);
      if (isOccupied) {
        newCounts[item.serviceDate] = 0;
      } else if (isRoom) {
        newCounts[item.serviceDate] = Math.min(1, item.availableCount);
      } else if (isPerson) {
        const remainingGuests = adults - existingCount;
        newCounts[item.serviceDate] = Math.min(remainingGuests, item.availableCount);
      } else {
        newCounts[item.serviceDate] = Math.max(0, item.availableCount);
      }
    });
    setDailyCounts(newCounts);
  };

  const handleDayCountChange = (date: string, newCount: number) => {
    setDailyCounts(prev => ({
      ...prev,
      [date]: newCount
    }));
  };

  const getTotalPrice = () => {
    return Math.round(Object.values(dailyCounts).reduce((sum, count) => sum + (count * extra.price), 0) * 100) / 100;
  };

  const getTotalCount = () => {
    return Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
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

        <div className='py-2.5 border-b border-t flex items-center justify-between'>
          <div className='flex flex-col text-lg font-semibold'>
            <h3>Select dates</h3>
            <p className='text-blue text-sm font-normal'>Choose quantity per day</p>
          </div>
          <Button variant="outline" className='h-[45px]' onClick={selectAll}>
          Select all available
          </Button>
        </div>

        <div className='relative'>
          <div 
            ref={scrollRef}
            className='flex flex-col gap-5 pt-2.5 pb-5 max-h-[400px] overflow-y-auto pr-6'
          >
            {availableTimeSlices.map(item => (
              <DayRow 
                key={item.serviceDate} 
                item={item} 
                count={dailyCounts[item.serviceDate] || 0}
                onCountChange={handleDayCountChange}
                pricingUnit={extra.pricingUnit}
                adults={adults}
                existingCount={existingCount}
                isOccupied={existingDates.includes(item.serviceDate)}
              />
          ))}
        </div>

          {showScrollIndicator && (
            <div className='absolute -bottom-5 left-0 right-0 h-10 bg-gradient-to-t from-background via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-2'>
              <ChevronDown className='size-6 text-gray-400 animate-bounce' />
          </div>
          )}
        </div>

        <div className='flex items-center justify-between pt-5'>
          <span>Total: {getTotalCount()} {extra.name}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            Confirm <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddLimitedExtra;

const DayRow = ({ 
  item, 
  count, 
  onCountChange,
  pricingUnit,
  adults,
  existingCount = 0,
  isOccupied = false
}: { 
  item: AvailabilityServiceItem, 
  count: number, 
  onCountChange: (date: string, count: number) => void,
  pricingUnit: string,
  adults: number,
  existingCount?: number,
  isOccupied?: boolean
}) => {
  const availableCount = item.availableCount;
  const isPast = dayjs(item.serviceDate).isBefore(dayjs(), 'day');
  const isDisabled = availableCount <= 0 || isPast || isOccupied;
  
  const getMaxLimit = () => {
    if (isDisabled) return 0;
    
    if (pricingUnit === 'Room') {
      return Math.min(1, availableCount);
    }
    if (pricingUnit === 'Person') {
      const remainingGuests = adults - existingCount;
      return Math.min(remainingGuests, availableCount);
    }
    return Math.max(0, availableCount);
  };
  
  const maxLimit = getMaxLimit();

  const add = () => {
    if (count >= maxLimit || isDisabled) return;
    onCountChange(item.serviceDate, count + 1);
  };

  const subtract = () => {
    if (count <= 0) return;
    onCountChange(item.serviceDate, count - 1);
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <span className={cn('font-bold', isDisabled && 'line-through text-gray')}>{dayjs(item.serviceDate).format('ddd DD MMM')}</span>
        {isPast ? <span className="text-gray text-sm">Past</span>
        : isOccupied ? <span className="text-gray text-sm">Added</span>
        : availableCount <= 0 ? <span className="text-gray text-sm">Sold Out</span>
        : <span className="text-gray text-sm">({availableCount})</span>}
      </div>

      <div className="flex items-center gap-2">
        <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0} />
        <span className="font-semibold min-w-[20px] text-center">
          {count}
        </span>
        <ButtonIcon onClick={add} symbol='+' disabled={count >= maxLimit || isDisabled} />
      </div>
    </div>
  );
};
