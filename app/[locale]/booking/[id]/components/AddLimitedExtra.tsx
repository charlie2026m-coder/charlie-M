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
import { AvailabilityServiceItem, Service } from "@/types/apaleo";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useBookingStore } from "@/store/useBookingStore";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { RoomOffer } from "@/types/offers";

const AddLimitedExtra = ({ extra, rooms, room, guests }: { extra: Service, rooms: RoomOffer[], room: RoomOffer, guests: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const services = useBookingStore(state => state.services);
  const setServices = useBookingStore(state => state.setServices);
  
  const maxRooms = rooms.length;
  
  // Initialize daily counts from saved service or default to 0
  const savedService = services.find(s => s.serviceId === extra.id);
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>(() => {
    const initialCounts: { [date: string]: number } = {};
    extra.timeSlices?.forEach(item => {
      const savedDateCount = savedService?.dates?.find(d => d.serviceDate === item.serviceDate)?.count;
      initialCounts[item.serviceDate] = savedDateCount || 0;
    });
    return initialCounts;
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const handleConfirm = () => {
    const newDates = extra.timeSlices?.map(item => ({
      serviceDate: item.serviceDate,
      count: dailyCounts[item.serviceDate] || 0,
      amount: {
        amount: extra.price * (dailyCounts[item.serviceDate] || 0),
        currency: extra.currency || 'EUR'
      }
    })).filter(d => d.count > 0) || [];

    const existingServices = services.filter(s => s.serviceId !== extra.id);
    
    // If no dates selected, just remove the service
    if (newDates.length === 0) {
      setServices(existingServices);
    } else {
      const newService = {
        serviceId: extra.id,
        dates: newDates,
      };
      setServices([...existingServices, newService]);
    }
    
    setIsOpen(false);
  };

  const selectAll = () => {
    const newCounts: { [date: string]: number } = {};
    extra.timeSlices?.forEach(item => {
      newCounts[item.serviceDate] = Math.max(0, Math.min(item.availableCount, maxRooms));
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
    return Object.values(dailyCounts).reduce((sum, count) => sum + (count * extra.price), 0);
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
        <div className='flex  flex-col text-lg font-semibold '>
            <h3>{room.name}</h3>
            <p className='text-blue'>{guests} guest{guests > 1 ? 's' : ''}  </p>
          </div>
          <Button variant="outline" className='h-[45px]' onClick={selectAll}>
            Select all available
          </Button>
        </div>

        <div className='flex flex-col gap-5 pt-2.5 pb-5'>
          {extra.timeSlices?.map(item => (
            <DayRow 
              key={item.serviceDate} 
              item={item} 
              count={dailyCounts[item.serviceDate] || 0}
              onCountChange={handleDayCountChange}
              maxRooms={maxRooms}
            />
          ))}
        </div>

        <div className='flex items-center justify-between pt-5'>
          <span>Total: {getTotalCount()} {extra.name}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            Confirm € {getTotalPrice().toFixed(2)}
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
  maxRooms
}: { 
  item: AvailabilityServiceItem, 
  count: number, 
  onCountChange: (date: string, count: number) => void,
  maxRooms: number
}) => {
  const availableCount = item.availableCount;
  const maxLimit = Math.max(0, Math.min(availableCount, maxRooms));

  const add = () => {
    if (count >= maxLimit) return;
    onCountChange(item.serviceDate, count + 1);
  };

  const subtract = () => {
    if (count <= 0) return;
    onCountChange(item.serviceDate, count - 1);
  };


  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <span className={cn('font-bold', availableCount <= 0 && 'line-through text-gray')}>{dayjs(item.serviceDate).format('ddd DD MMM')}</span>
        {availableCount <= 0 
        ? <span className="text-gray text-sm">Sold Out</span>
        : <span className="text-gray text-sm">({availableCount})</span>}
      </div>

      <div className="flex items-center gap-2">
        <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0} />
        <span className="font-semibold min-w-[20px] text-center">
          {count}
        </span>
        <ButtonIcon onClick={add} symbol='+' disabled={count >= maxLimit} />
      </div>
    </div>
  );
};
