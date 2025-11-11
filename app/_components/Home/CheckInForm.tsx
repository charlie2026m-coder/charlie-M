'use client';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Separator } from '../ui/separator';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '../ui/DateInput';
import { Guests } from '../ui/guests';
import { Calendar } from '../ui/calendar';
import { DateRange } from 'react-day-picker';
import Link from 'next/link';

const CheckInForm = ({ className = '', isBrown = false }: { className?: string, isBrown?: boolean }) => {
  const [checkInDate, setCheckInDate] = useState<DateRange | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<DateRange | undefined>(undefined);
  const [guests, setGuests] = useState(1);
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [openCheckOut, setOpenCheckOut] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ checkInDate, checkOutDate, guests });
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
            value={checkInDate}
            open={openCheckIn}
            onOpenChange={handleCheckInOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={checkInDate as DateRange}
              onSelect={(date) => setCheckInDate(date as DateRange)}
              disabled={{ before: new Date() }}
            />
          </DateInput>
        </label>
        <Separator orientation="vertical" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Check Out</div>
          <DateInput 
            value={checkOutDate}
            open={openCheckOut}
            onOpenChange={handleCheckOutOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={checkOutDate as DateRange}
              onSelect={(date) => setCheckOutDate(date as DateRange)}
              disabled={{ 
                before: checkInDate?.to || new Date() 
              }}
            />
          </DateInput>
        </label>
        <Separator orientation="vertical" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests />
        </label>
      </section>
      <Link href={`/rooms`} >    
        <button className={cn('h-[100px] cursor-pointer w-[110px] flex items-center justify-center rounded-r-[30px]  transition-all duration-300', isBrown ? 'bg-brown hover:bg-brown/80' : 'bg-blue hover:bg-blue/80')}>
          <RiSearchLine className='text-white text-[40px]  ' />
        </button>
      </Link>
    </form>
  );
};

export default CheckInForm;
