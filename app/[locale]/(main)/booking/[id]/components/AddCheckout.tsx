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
import dayjs from "dayjs";
import { Room, RoomExtra } from "@/types/types";
import { useTranslations } from "next-intl";
import { trackSelectExtra } from "@/lib/analytics";

const AddCheckoutExtra = ({ extra, rooms }: { extra: Service, rooms: Room[]}) => {
  const t = useTranslations('bookingForm');
  const [isOpen, setIsOpen] = useState(false);
  const editRoom = useBookingStore(state => state.editRoom);
  
  const mode = extra.availability?.mode;
  
  const timeSlice = mode === 'Arrival' 
    ? extra.timeSlices?.[0] 
    : extra.timeSlices?.[extra.timeSlices.length - 1];
  
  const availableCount = timeSlice?.availableCount || 0;
  const maxLimit = 1;
  
  const getSavedCount = (room: Room) => {
    const roomExtra = room.extras?.some(e => e.id === extra.id);
    return roomExtra ? 1 : 0;
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
    return Math.round(extra.price * totalCount * 100) / 100;
  };

  const getTotalCount = () => {
    return Object.values(roomCounts).reduce((sum, count) => sum + count, 0);
  };

  const isLimitReached = () => {
    return getTotalCount() >= availableCount;
  };

  const add = (roomId: string) => {
    if (roomCounts[roomId] >= maxLimit || isLimitReached()) return;
    // GA4 select_extra — guest added this checkout service (upsell interest).
    trackSelectExtra({ name: extra.name, price: extra.price });
    setRoomCounts(prev => ({ ...prev, [roomId]: 1 }));
  };

  const subtract = (roomId: string) => {
    if (roomCounts[roomId] <= 0) return;
    setRoomCounts(prev => ({ ...prev, [roomId]: 0 }));
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
          totalPrice: extra.price, // Checkout services are one-time, not per night
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
            {t('add')} {extra.name} (€{extra.price})
          </DialogTitle>
        </DialogHeader>


        {extra.description && (
          <p className='text-dark text-sm mb-4'>{extra.description}</p>
        )}
        <div className='flex flex-col gap-5 pb-5 border-t pt-10'>
          {isLimitReached() && (
            <div className='text-red-600 text-sm font-semibold text-center -mt-5'>
              {t('soldOut')}
            </div>
          )}
          
          {rooms.map((room, index) => {
            const count = roomCounts[room.id] || 0;
            
            return (
              <div key={room.id} className='flex flex-col gap-2'>
                {rooms.length > 1 && (
                  <div className='font-semibold text-base text-gray-600 italic'>
                    {t('room')} {index + 1}
                  </div>
                )}
                
                <div className='flex items-center justify-between gap-2 overflow-hidden'>
                  <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
                    <span className='font-bold truncate'>
                      {timeSlice ? dayjs(timeSlice.serviceDate).format('ddd DD MMM') : mode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ButtonIcon onClick={() => subtract(room.id)} symbol='-' disabled={count <= 0} />
                    <span className="font-semibold min-w-[20px] text-center">
                      {count}
                    </span>
                    <ButtonIcon onClick={() => add(room.id)} symbol='+' disabled={count >= maxLimit || isLimitReached()} />
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

export default AddCheckoutExtra;
