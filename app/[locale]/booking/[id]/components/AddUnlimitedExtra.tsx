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
import { Room } from "@/types/types";

const AddUnlimitedExtra = ({ extra, room, guests, children, rooms, nights }: { extra: Service, room: RoomOffer, guests: number, children: number, rooms: Room[], nights: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const services = useBookingStore(state => state.services);
  const setServices = useBookingStore(state => state.setServices);
  
  // Get saved count for this service
  const savedService = services.find(s => s.serviceId === extra.id);
  const [count, setCount] = useState(savedService?.count || 0);
  
  const mode = extra.availability?.mode;//Daily, Arrival, Departure
  const pricingUnit = extra.pricingUnit;//Person, Room
  // Calculate max limit based on pricing unit
  const getMaxLimit = () => {
    if (pricingUnit === 'Room') {
      return rooms.length;
    }
    if (pricingUnit === 'Person') {
      // Max is total number of guests across all rooms
      return guests;
    }
    return 1;
  };

  const maxLimit = getMaxLimit();

  // Calculate total price
  const getTotalPrice = () => {
    // Daily services are per night
    if (mode === 'Daily' && pricingUnit === 'Room') {
      return extra.price * count * nights;
    }
    
    if (mode === 'Daily' && pricingUnit === 'Person') {
      return extra.price * count * nights;
    }
    
    return extra.price * count;
  };
  const add = () => {
    if (count >= maxLimit) return
    setCount(count + 1)
  }
  const subtract =() => {
    if (count <= 0) return
    setCount(count - 1)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Load saved count when opening
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

    // Add new service with count
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

        <div className='py-2.5 border-b border-t flex items-center justify-between'>
          <div className='flex  flex-col text-lg font-semibold '>
            <h3>{room.name}</h3>
            <p className='text-blue'>{guests} guest{guests > 1 ? 's' : ''}  </p>
          </div>
          <Button variant="outline" className='h-[45px]' onClick={() => setCount(maxLimit)}>
          Select all available
          </Button>
        </div>

        <div className='flex items-center justify-between pt-2.5 pb-5'>
          <div className='flex flex-col '>
            <span className='font-semibold'>{extra.name}</span>
            <span className='text-sm text-gray-500'>            {
              mode === 'Daily' && pricingUnit === 'Room' ? `€${extra.price} × ${nights} nights × rooms (max ${rooms.length})` :
              mode === 'Daily' && pricingUnit === 'Person' ? `€${extra.price} × ${nights} nights × guests` :
              mode === 'Arrival' && pricingUnit === 'Room' ? `€${extra.price} × rooms (max ${rooms.length})` :
              mode === 'Arrival' && pricingUnit === 'Person' ? `€${extra.price} × ${guests} guests` :
              mode === 'Departure' && pricingUnit === 'Room' ? `€${extra.price} × rooms (max ${rooms.length})` :
              mode === 'Departure' && pricingUnit === 'Person' ? `€${extra.price} × ${guests} guests` :
              ''
              }</span>
          </div>
          <div className="flex items-center gap-2">
            <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0} />
              <span className="font-semibold min-w-[20px] text-center">
                {count}
              </span>
              <ButtonIcon onClick={add} symbol='+' disabled={count >= maxLimit} />
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

export default AddUnlimitedExtra;