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
import { Room, RoomExtra } from "@/types/types";
import { useTranslations } from "next-intl";
import { trackSelectExtra } from "@/lib/analytics";

const AddCleaningExtra = ({ extra, rooms }: { extra: Service, rooms: Room[] }) => {
  const t = useTranslations('bookingForm');
  const [isOpen, setIsOpen] = useState(false);
  const editRoom = useBookingStore(state => state.editRoom);
  
  const allTimeSlices = extra.timeSlices?.slice(1, -1) || [];
  const daysOfWeek = extra.daysOfWeek || extra.availability?.daysOfWeek || [];
  const availableTimeSlices = daysOfWeek.length > 0
    ? allTimeSlices.filter(timeSlice => {
        const date = dayjs(timeSlice.serviceDate);
        const dayName = date.format('dddd');
        return daysOfWeek.includes(dayName);
      })
    : allTimeSlices;

  const getSavedDatesForRoom = (room: Room) => {
    const roomExtra = room.extras?.find(e => e.id === extra.id);
    if (roomExtra?.selectedDates) {
      const datesObj: { [date: string]: number } = {};
      roomExtra.selectedDates.forEach(item => {
        datesObj[item.serviceDate] = item.count;
      });
      return datesObj;
    }
    return {};
  };
  
  const [roomDailyCounts, setRoomDailyCounts] = useState<{ [roomId: string]: { [date: string]: number } }>(() => {
    const initValues: { [roomId: string]: { [date: string]: number } } = {};
    rooms.forEach((room) => {
      initValues[room.id] = getSavedDatesForRoom(room);
    });
    return initValues;
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const initValues: { [roomId: string]: { [date: string]: number } } = {};
      rooms.forEach((room) => {
        initValues[room.id] = getSavedDatesForRoom(room);
      });
      setRoomDailyCounts(initValues);
    }
  };

  const handleConfirm = () => {
    rooms.forEach((room) => {
      const roomCounts = roomDailyCounts[room.id] || {};
      
      const selectedDates = Object.entries(roomCounts)
        .filter(([_, count]) => count > 0)
        .map(([date, count]) => ({ serviceDate: date, count }));
      
      const currentExtras = room.extras || [];
      const filteredExtras = currentExtras.filter(e => e.id !== extra.id);
      
      if (selectedDates.length > 0) {
        // Calculate totalPrice for this room's cleaning services
        const totalPrice = selectedDates.reduce((sum, date) =>
          sum + (date.count * extra.price), 0);
        // GA4 select_extra — mid-stay cleaning upsell confirmed.
        trackSelectExtra({ name: extra.name, price: Math.round(totalPrice * 100) / 100 });

        const roomExtra: RoomExtra = {
          ...extra,
          selectedDates,
          totalPrice: Math.round(totalPrice * 100) / 100,
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

  const selectAll = () => {
    const newCounts: { [roomId: string]: { [date: string]: number } } = {};
    rooms.forEach((room) => {
      const roomDates: { [date: string]: number } = {};
      availableTimeSlices.forEach(item => {
        const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
        roomDates[formattedDate] = 1;
      });
      newCounts[room.id] = roomDates;
    });
    setRoomDailyCounts(newCounts);
  };

  const clearAll = () => {
    const newCounts: { [roomId: string]: { [date: string]: number } } = {};
    rooms.forEach((room) => {
      newCounts[room.id] = {};
    });
    setRoomDailyCounts(newCounts);
  };

  const handleDayCountChange = (roomId: string, date: string, newCount: number) => {
    setRoomDailyCounts(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [date]: newCount
      }
    }));
  };

  const getTotalPrice = () => {
    let total = 0;
    Object.values(roomDailyCounts).forEach(roomCounts => {
      Object.values(roomCounts).forEach(count => {
        total += count * extra.price;
      });
    });
    return Math.round(total * 100) / 100;
  };

  const getTotalCount = () => {
    let total = 0;
    Object.values(roomDailyCounts).forEach(roomCounts => {
      Object.values(roomCounts).forEach(count => {
        total += count;
      });
    });
    return total;
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
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-hidden flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className='font-[900] text-xl w-4/5 md:w-full'>
            {t('addExtra', { name: extra.name, price: extra.price })}
          </DialogTitle>
        </DialogHeader>

        <div className='flex items-center justify-start gap-2 pt-2.5 pb-2 border-b'>
          <Button variant="outline" className='h-[35px] flex-shrink-0 whitespace-nowrap' onClick={clearAll}>
            {t('clearAll')}
          </Button>
          <Button variant="outline" className='h-[35px] flex-shrink-0 whitespace-nowrap' onClick={selectAll}>
            {t('selectAllAvailable')}
          </Button>
        </div>

        {extra.description && (
          <p className='text-dark text-sm mb-4'>{extra.description}</p>
        )}
        <div className='flex flex-col gap-4 pt-4 pb-5 max-h-[400px] overflow-y-auto overflow-x-hidden min-w-0 pr-2'>
          {rooms.map((room, index) => {
            const roomCounts = roomDailyCounts[room.id] || {};
            
            return (
              <div key={room.id} className='flex flex-col gap-1 pr-2'>
                {rooms.length > 1 && (
                  <div className='relative flex items-center w-fit gap-2'>
                    <span className='relative text-base font-semibold text-green'>{t('room')} {index + 1}</span>
                  </div>
                )}
                
                <div className='flex flex-col gap-3'>
                  {availableTimeSlices.map(item => {
                    const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD');
                    return (
                      <DayRow 
                        key={`${room.id}-${item.serviceDate}`}
                        item={item} 
                        count={roomCounts[formattedDate] || 0}
                        onCountChange={(date, newCount) => handleDayCountChange(room.id, date, newCount)}
                        maxLimit={1}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className='flex items-center justify-between pt-5 min-w-0 gap-4'>
          <span className='font-[900] truncate min-w-0'>{t('total')}: {getTotalCount()}</span>
          <Button onClick={handleConfirm} className='h-[45px] flex-shrink-0'>
            {t('confirm')} <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCleaningExtra;

const DayRow = ({ 
  item, 
  count, 
  onCountChange,
  maxLimit
}: { 
  item: AvailabilityServiceItem, 
  count: number, 
  onCountChange: (date: string, count: number) => void,
  maxLimit: number
}) => {
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
    <div className='flex items-center justify-between gap-2 overflow-hidden'>
      <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
        <span className='font-bold truncate'>
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
