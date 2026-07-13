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
import { trackSelectExtra } from "@/lib/analytics";

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
    // GA4 select_extra — upsell added (parking / daily service).
    trackSelectExtra({ name: extra.name, price: extra.price });
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
        let totalPrice = 0;
        
        if (mode === 'Daily') {
          totalPrice = Math.round(extra.price * count * nights * 100) / 100;
        } else {
          totalPrice = Math.round(extra.price * count * 100) / 100;
        }
        
        const roomExtra: RoomExtra = {
          ...extra,
          count: count,
          totalPrice: totalPrice,
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
      <DialogTrigger asChild className='ml-auto md:ml-0'>
        <div className='self-start md:self-auto'>
          <div className='flex md:hidden items-center justify-center rounded transition-all duration-300 cursor-pointer size-10 shadow-lg bg-blue border-blue text-white'>
            <FaPlus className='size-6' />
          </div>
          <Button variant="outline" className='hidden md:block h-[35px] p-0 w-full'>{t('add')}</Button>
        </div>
      </DialogTrigger>
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle className='font-semibold text-xl w-4/5 md:w-full'>
            {t('add')} {extra.name} (€{extra.price}{isParking ? '/night' : ''})
          </DialogTitle>
        </DialogHeader>

        {extra.description && (
          <p className='text-dark text-sm mb-4'>{extra.description}</p>
        )}
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
                
                <div className='flex items-center justify-between gap-2 overflow-hidden'>
                  <div className='flex flex-col gap-1 min-w-0 flex-1 overflow-hidden'>
                    <span className='font-semibold truncate'>{extra.name}</span>
                    <span className='text-sm text-gray-500 truncate'>
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
          <span>{t('total')}: {getTotalCount()}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            {t('confirm')} <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUnlimitedExtra;