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
import { RoomOffer } from "@/types/offers";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useBookingStore } from "@/store/useBookingStore";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { Room } from "@/types/types";
  
const AddCheckoutExtra = ({ extra, rooms }: { extra: Service, rooms: Room[]}) => {
  const [isOpen, setIsOpen] = useState(false);
  const services = useBookingStore(state => state.services);
  const setServices = useBookingStore(state => state.setServices);
  
  const mode = extra.availability?.mode; // Arrival or Departure
  
  // Get the relevant timeSlice based on mode
  const timeSlice = mode === 'Arrival' 
    ? extra.timeSlices?.[0] 
    : extra.timeSlices?.[extra.timeSlices.length - 1];
  
  const availableCount = timeSlice?.availableCount || 0;
  const maxRooms = rooms.length;
  const maxLimit = Math.min(availableCount, maxRooms);
  
  // Get saved count for this service
  const savedService = services.find(s => s.serviceId === extra.id);
  const [count, setCount] = useState(savedService?.count || 0);

  const getTotalPrice = () => {
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
    const updatedServices = services.filter(s => s.serviceId !== extra.id);
    
    // If count is 0, just remove the service
    if (count === 0) {
      setServices(updatedServices);
      setIsOpen(false);
      return;
    }

    const newService = {
      serviceId: extra.id,
      count: count,
    };

    setServices([...updatedServices, newService]);
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
                {timeSlice ? dayjs(timeSlice.serviceDate).format('ddd DD MMM') : mode}
              </span>
              {availableCount === 0 
                ? <span className="text-gray text-sm">Sold Out</span>
                : <span className="text-gray text-sm">({availableCount} available, max {maxRooms} rooms)</span>
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