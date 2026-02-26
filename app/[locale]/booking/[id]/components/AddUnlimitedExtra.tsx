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
import { useBookingStore } from "@/store/useBookingStore";
import { Room, RoomExtra } from "@/types/types";
import { useTranslations } from "next-intl";

const AddUnlimitedExtra = ({ extra, rooms, nights, isParking = false }: { extra: Service, rooms: Room[], nights: number, isParking?: boolean }) => {
  const t = useTranslations('bookingForm');
  const [isOpen, setIsOpen] = useState(false);
  const editRoom = useBookingStore(state => state.editRoom);
  
  const mode = extra.availability?.mode;
  const pricingUnit = extra.pricingUnit;
  
  const getMaxLimitPerRoom = (targetRoom: Room) => {
    if (pricingUnit === 'Person') return targetRoom.adults + targetRoom.children;
    return 1;
  };

  const getSavedCount = (targetRoom: Room) => {
    const roomExtra = targetRoom.extras?.find(e => e.id === extra.id);
    return roomExtra?.count || 0;
  };

  const [roomCounts, setRoomCounts] = useState<{ [roomId: string]: number }>(() => {
    const counts: { [roomId: string]: number } = {};
    rooms.forEach((room) => {
      counts[room.id] = getSavedCount(room);
    });
    return counts;
  });

  const getTotalPrice = () => {
    const totalCount = Object.values(roomCounts).reduce((sum, count) => sum + count, 0);
    
    if (mode === 'Daily') {
      return Math.round(extra.price * totalCount * nights * 100) / 100;
    }
    
    return Math.round(extra.price * totalCount * 100) / 100;
  };

  const getTotalCount = () => {
    return Object.values(roomCounts).reduce((sum, count) => sum + count, 0);
  };

  const add = (roomId: string, maxLimit: number) => {
    const currentCount = roomCounts[roomId] || 0;
    if (currentCount >= maxLimit) return;
    setRoomCounts(prev => ({ ...prev, [roomId]: currentCount + 1 }));
  };

  const subtract = (roomId: string) => {
    const currentCount = roomCounts[roomId] || 0;
    if (currentCount <= 0) return;
    setRoomCounts(prev => ({ ...prev, [roomId]: currentCount - 1 }));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const counts: { [roomId: string]: number } = {};
      rooms.forEach((room) => {
        counts[room.id] = getSavedCount(room);
      });
      setRoomCounts(counts);
    }
  };

  const handleConfirm = () => {
    rooms.forEach((room) => {
      const count = roomCounts[room.id] || 0;
      
      const currentExtras = room.extras || [];
      const filteredExtras = currentExtras.filter(e => e.id !== extra.id);
      
      if (count > 0) {
        const roomExtra: RoomExtra = {
          ...extra,
          count: count,
        };
        editRoom(room.id, {
          ...room,
          extras: [...filteredExtras, roomExtra],
        });
      } else {
        editRoom(room.id, {
          ...room,
          extras: filteredExtras,
        });
      }
    });
    
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
            {t('add')} {extra.name} (€{extra.price}{isParking ? '/night' : ''})
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-5 pb-5 border-t pt-10'>
          {rooms.map((room, index) => {
            const count = roomCounts[room.id] || 0;
            const maxLimit = getMaxLimitPerRoom(room);
            
            return (
              <div key={room.id} className='flex flex-col gap-2'>
                {rooms.length > 1 && (
                  <div className='font-semibold text-base text-gray-600 italic'>
                    {t('room')} {index + 1}
                  </div>
                )}
                
                <div className='flex items-center justify-between'>
                  <div className='flex items-end gap-2'>
                    <span className='font-semibold'>{extra.name}</span>
                    <span className='text-sm text-gray-500'>
                      {isParking 
                        ? `€${extra.price} × ${nights} nights × parking spots (max ${maxLimit})`
                        : mode === 'Daily' && pricingUnit === 'Room' ? `€${extra.price} × ${nights} nights × rooms (max ${maxLimit})` :
                        mode === 'Daily' && pricingUnit === 'Person' ? `€${extra.price} × ${nights} nights × guests (max ${maxLimit})` :
                        mode === 'Arrival' && pricingUnit === 'Room' ? `€${extra.price} × rooms (max ${maxLimit})` :
                        mode === 'Arrival' && pricingUnit === 'Person' ? `€${extra.price} × ${room.adults + room.children} guests` :
                        mode === 'Departure' && pricingUnit === 'Room' ? `€${extra.price} × rooms (max ${maxLimit})` :
                        mode === 'Departure' && pricingUnit === 'Person' ? `€${extra.price} × ${room.adults + room.children} guests` :
                        ''
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ButtonIcon onClick={() => subtract(room.id)} symbol='-' disabled={count <= 0} />
                    <span className="font-semibold min-w-[20px] text-center">
                      {count}
                    </span>
                    <ButtonIcon onClick={() => add(room.id, maxLimit)} symbol='+' disabled={count >= maxLimit} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className='flex items-center justify-between pt-5'>
          <span>{t('total')}: {getTotalCount()} {extra.name}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            {t('confirm')} <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUnlimitedExtra;