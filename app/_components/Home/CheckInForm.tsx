'use client';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Separator } from '../ui/separator';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '../ui/DateInput';
import { Guests } from '../ui/guests';

const CheckInForm = ({ className = '', isBrown = false }: { className?: string, isBrown?: boolean }) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ checkIn, checkOut, guests });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex bg-white rounded-[30px]', className )}>
      <section className='flex py-3 pr-10 pl-7 w-full justify-between gap-[45px]'>
        <label className='w-full'>
          <div className='font-medium mb-2'>Check In</div>
          <DateInput />
        </label>
        <Separator orientation="vertical" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Check Out</div>
          <DateInput />
        </label>
        <Separator orientation="vertical" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests />
        </label>
      </section>
      <button className={cn('h-[100px] w-[110px] flex items-center justify-center rounded-r-[30px]  transition-all duration-300', isBrown ? 'bg-brown hover:bg-brown/80' : 'bg-blue hover:bg-blue/80')}>
        <RiSearchLine className='text-white text-[40px] cursor-pointer ' />
      </button>
    </form>
  );
};

export default CheckInForm;
