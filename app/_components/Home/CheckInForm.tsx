'use client';
import { cn, getDate, getPath } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Separator } from '../ui/separator';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '../ui/DateInput';
import { Guests } from '../ui/guests';
import { Calendar } from '../ui/calendar';
import { DateRange } from 'react-day-picker';
import { Button } from "../ui/button"
import { useRouter } from 'next/navigation';  
import { useBookingStore } from '@/store/bookingStore';
const CheckInForm = ({ 
    className = '', 
    isBrown = false, 
    params 
  }:{ 
    className?: string, 
    isBrown?: boolean, 
    params?: { 
      from: string | undefined | Date, 
      to: string | undefined | Date, 
      adults: string | undefined, 
      children: string | undefined 
    }
  }) => {
  const { dateRange, guests, setValue } = useBookingStore();
  const router = useRouter();
  const [openCalendar, setOpenCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  useEffect(() => {
    if (params) {
      if (params.from && params.to) {
        const fromDate = new Date(params.from);
        const toDate = new Date(params.to);
        
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setValue({
            from: fromDate,
            to: toDate,
          }, 'dateRange');
          
          setCurrentMonth(new Date(fromDate.getFullYear(), fromDate.getMonth(), 1));
        }
      }
      
      if (params.adults !== undefined || params.children !== undefined) {
        setValue({
          adults: params.adults ? Number(params.adults) : 1,
          children: params.children ? Number(params.children) : 0,
        }, 'guests');
      }
    }
  }, [params, setValue])
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

  const handlePrimaryMonthChange = (month: Date) => {
    setCurrentMonth(new Date(month.getFullYear(), month.getMonth(), 1));
  };

  const handleSecondaryMonthChange = (month: Date) => {
    const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    setCurrentMonth(previousMonth);
  };

  const getNights = () => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const nights = Math.ceil((dateRange.to as Date).getTime() - (dateRange.from as Date).getTime()) / (1000 * 60 * 60 * 24);
    if(nights === 0) return null;
    return nights === 1 ? '1 night' : `${nights} nights`;
  }
  const resetForm = () => {
    setValue({
      from: undefined,
      to: undefined,
    }, 'dateRange');
    setOpenCalendar(false)
  }
  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col md:flex-row  bg-white rounded-[30px]', className )}>
      <section className='flex flex-col md:flex-row p-3 px-4 md:pr-10 md:pl-7 w-full justify-between gap-5 md:gap-[45px]'>

        <label className='w-full md:w-2/3'>
          <div className='flex font-medium mb-2 gap-2 h-5 '>
            <div className=' pr-2 border-r-2 border-black pb-1'>Check In  </div>
            <div className='pb-1'>Check out</div>
          </div>
          <DateInput 
            value={dateRange || undefined}
            open={openCalendar}
            onOpenChange={setOpenCalendar}
          >
            <div className='flex flex-col md:flex-row gap-2  pb-2 '>
              <Calendar 
                required={false}
                mode="range"  
                captionLayout="label"
                selected={dateRange}
                onSelect={(date) => setValue(date as DateRange, 'dateRange')}
                month={currentMonth}
                onMonthChange={handlePrimaryMonthChange}
                disabled={{ 
                  before: new Date() 
                }}
              />
              <Separator orientation="vertical" className='!h-auto' />
              <Calendar 
                required={false}
                mode="range"  
                captionLayout="label"
                selected={dateRange}
                onSelect={(date) => setValue(date as DateRange, 'dateRange')}
                month={nextMonth}
                onMonthChange={handleSecondaryMonthChange}
                disabled={{ 
                  before: new Date() 
                }}
              />
            </div>
            {getNights() &&
                <div className='font-semibold pt-5 pb-3 border-t'>
               {getNights()}
            </div>}
            <div className='grid grid-cols-2 gap-2 md:hidden'>
              <Button onClick={resetForm} className='w-full' variant='outline'>Cancel</Button>
              <Button onClick={()=> setOpenCalendar(false)} className='w-full'>Apply</Button>
            </div>
          </DateInput>
       </label>
        <Separator orientation="vertical" className='hidden md:block'/>
        <Separator orientation="horizontal" className=' md:hidden'/>

        <label className='w-full md:w-1/3'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests setValue={(value) => setValue(value, 'guests')} value={guests} />
        </label>
      </section>
        <button
          disabled={!dateRange?.from || !dateRange?.to}
          className={cn('h-[100px]  cursor-pointer w-[110px] hidden  md:flex items-center justify-center rounded-r-[30px]  transition-all duration-300', isBrown ? 'bg-brown hover:bg-brown/80' : 'bg-blue hover:bg-blue/80')}
          type='submit'
        >
          <RiSearchLine className='text-white text-[40px]  ' />
        </button>
        <button
          disabled={!dateRange?.from || !dateRange?.to}
          className={cn('py-3 text-lg text-white gap-2 mt-2 font-bold cursor-pointer md:hidden flex items-center justify-center rounded-b-[30px]  transition-all duration-300', isBrown ? 'bg-brown hover:bg-brown/80' : 'bg-blue hover:bg-blue/80')}
          type='submit'
        >
          <RiSearchLine className='text-white text-[25px]  ' /> Check Availability
        </button>
    </form>
  );
};

export default CheckInForm;
