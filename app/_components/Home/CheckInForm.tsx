'use client';
import { cn, getDate, getPath } from '@/lib/utils';
import { useState } from 'react';
import { Separator } from '../ui/separator';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '../ui/DateInput';
import { Guests } from '../ui/guests';
import { Calendar } from '../ui/calendar';
import { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';  
const CheckInForm = ({ 
    className = '', 
    isBrown = false, 
    params 
  }:{ 
    className?: string, 
    isBrown?: boolean, 
    params?: { 
      from: string | undefined, 
      to: string | undefined, 
      adults: string | undefined, 
      children: string | undefined 
    }
  }) => {
  const router = useRouter();
  const [guests, setGuests] = useState({adults: parseInt(params?.adults || '1'), children: parseInt(params?.children || '0') });
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [openCheckOut, setOpenCheckOut] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: params?.from ? new Date(params.from) : undefined,
    to: params?.to ? new Date(params.to) : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateRange?.from || !dateRange?.to) return;
    const queryString = getPath({
      from: getDate(dateRange?.from),
      to: getDate(dateRange?.to),
      adults: guests.adults.toString(),
      children: guests.children.toString(),
    });
    router.push(`/rooms?${queryString}`); 
  };
  const handleCheckInOpenChange = (open: boolean) => {
    setOpenCheckIn(open);
    if (open) setOpenCheckOut(false); // Close check-out when check-in opens
  };
  
  const handleCheckOutOpenChange = (open: boolean) => {
    setOpenCheckOut(open);
    if (open) setOpenCheckIn(false); // Close check-in when check-out opens
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex bg-white rounded-[30px]', className )}>
      <section className='flex py-3 pr-10 pl-7 w-full justify-between gap-[45px]'>
        <label className='w-full'>
          <div className='font-medium mb-2'>Check In</div>
          <DateInput 
            value={dateRange?.from}
            open={openCheckIn}
            onOpenChange={handleCheckInOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={dateRange}
              onSelect={(date) => setDateRange(date as DateRange)}
              disabled={{ before: new Date() }}
            />
          </DateInput>
        </label>
        <Separator orientation="vertical" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Check Out</div>
          <DateInput 
            value={dateRange?.to}
            open={openCheckOut}
            onOpenChange={handleCheckOutOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={dateRange}
              onSelect={(date) => setDateRange(date as DateRange)}
              disabled={{ 
                before: dateRange?.from || new Date() 
              }}
            />
          </DateInput>
       </label>
        <Separator orientation="vertical" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests setValue={setGuests} value={guests} />
        </label>
      </section>
        <button
          disabled={!dateRange?.from || !dateRange?.to}
          className={cn('h-[100px] cursor-pointer w-[110px] flex items-center justify-center rounded-r-[30px]  transition-all duration-300', isBrown ? 'bg-brown hover:bg-brown/80' : 'bg-blue hover:bg-blue/80')}
          type='submit'
        >
          <RiSearchLine className='text-white text-[40px]  ' />
        </button>
    </form>
  );
};

export default CheckInForm;
