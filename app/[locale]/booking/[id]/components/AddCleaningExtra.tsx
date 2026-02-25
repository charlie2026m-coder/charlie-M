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
import { useState, useEffect } from "react";
import { AvailabilityServiceItem, Service } from "@/types/apaleo";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useBookingStore } from "@/store/useBookingStore";
import dayjs from "dayjs";
import { Room } from "@/types/types";

const AddCleaningExtra = ({ extra, rooms, roomName }: { extra: Service, rooms: Room[], roomName: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const allServices = useBookingStore(state => state.services);
  const setServices = useBookingStore(state => state.setServices);
  const savedDates = allServices.find(s => s.serviceId === extra.id)?.dates || [];
  const [dailyCounts, setDailyCounts] = useState<{ [date: string]: number }>({});

  const maxRooms = rooms.length;

  useEffect(()=>{
    const initValues: { [date: string]: number } = {};
    savedDates.forEach(item => {
      initValues[item.serviceDate] = item.count;
    });
    setDailyCounts(initValues);
  }, [savedDates.length])
  
  // Calculate available time slices
  const allTimeSlices = extra.timeSlices?.slice(1, -1) || [];
  const daysOfWeek = extra.daysOfWeek || extra.availability?.daysOfWeek || [];
  const availableTimeSlices = daysOfWeek.length > 0
    ? allTimeSlices.filter(timeSlice => {
        const date = dayjs(timeSlice.serviceDate);
        const dayName = date.format('dddd');
        return daysOfWeek.includes(dayName);
      })
    : allTimeSlices;


  const handleConfirm = () => {
    const newDates = availableTimeSlices.map(item => {
      const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
      return {
        serviceDate: formattedDate,
        count: dailyCounts[formattedDate] || 0,
        amount: {
          amount: extra.price * (dailyCounts[formattedDate] || 0),
          currency: extra.currency || 'EUR'
        }
      };
    }).filter(d => d.count > 0);

    const existingServices = allServices.filter(s => s.serviceId !== extra.id);
    
    if (newDates.length === 0) {
      setServices(existingServices);
    } else {
      setServices([...existingServices, { serviceId: extra.id, dates: newDates }]);
    }
    
    setIsOpen(false);
  };

  const selectAll = () => {
    const newCounts: { [date: string]: number } = {};
    availableTimeSlices.forEach(item => {
      const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
      newCounts[formattedDate] = maxRooms;
    });
    setDailyCounts(newCounts);
  };

  const handleDayCountChange = (date: string, newCount: number) => {
    setDailyCounts(prev => ({ ...prev, [date]: newCount }));
  };

  const getTotalPrice = () => {
    return Object.values(dailyCounts).reduce((sum, count) => sum + (count * extra.price), 0);
  };

  const getTotalCount = () => {
    return Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className='absolute flex top-2.5 right-2.5 items-center justify-center rounded transition-all duration-300 cursor-pointer size-10 shadow-lg bg-blue border-blue text-white'>
          <FaPlus className='size-6' />
        </div>
      </DialogTrigger>
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className='font-semibold text-xl'>
            Add {extra.name} (€{extra.price})
          </DialogTitle>
        </DialogHeader>

        <div className='py-2.5 border-b border-t flex items-center gap-4 min-w-0'>
          <div className='text-lg font-semibold truncate min-w-0 flex-1'>{roomName}</div>
          <Button variant="outline" className='h-[45px] flex-shrink-0 whitespace-nowrap' onClick={selectAll}>
            Select all available
          </Button>
        </div>

        <div className='flex flex-col gap-5 pt-2.5 pb-5 max-h-[400px] overflow-y-auto overflow-x-hidden min-w-0'>
          {availableTimeSlices.map(item => {
            const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
            return (
              <DayRow 
                key={item.serviceDate} 
                item={item} 
                count={dailyCounts[formattedDate] || 0}
                onCountChange={handleDayCountChange}
                maxRooms={maxRooms}
              />
            );
          })}
        </div>

        <div className='flex items-center justify-between pt-5 min-w-0 gap-4'>
          <span className='truncate min-w-0'>Total: {getTotalCount()} {extra.name}</span>
          <Button onClick={handleConfirm} className='h-[45px] flex-shrink-0'>
            Confirm <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCleaningExtra;

const DayRow = ({ item, count,  onCountChange, maxRooms }: {  item: AvailabilityServiceItem,  count: number,  onCountChange: (date: string, count: number) => void, maxRooms: number}) => {
  const maxLimit = maxRooms;
  const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');

  const add = () => {
    if (count >= maxLimit) return;
    onCountChange(formattedDate, count + 1);
  };

  const subtract = () => {
    if (count <= 0) return;
    onCountChange(formattedDate, count - 1);
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <span className='font-bold'>
          {dayjs(item.serviceDate).format('ddd DD MMM')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0} />
        <span className="font-semibold min-w-[20px] text-center">{count}</span>
        <ButtonIcon onClick={add} symbol='+' disabled={count >= maxLimit} />
      </div>
    </div>
  );
};
