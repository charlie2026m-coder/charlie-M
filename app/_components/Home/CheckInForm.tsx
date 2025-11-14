'use client';
import { cn, getDate, getPath } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Separator } from '../ui/separator';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '../ui/DateInput';
import { Guests } from '../ui/guests';
import { Calendar } from '../ui/calendar';
import { DateRange } from 'react-day-picker';
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
      from: string | undefined, 
      to: string | undefined, 
      adults: string | undefined, 
      children: string | undefined 
    }
  }) => {
  const { dateRange, guests, sevValue } = useBookingStore();
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
          sevValue({
            from: fromDate,
            to: toDate,
          }, 'dateRange');
          
          setCurrentMonth(new Date(fromDate.getFullYear(), fromDate.getMonth(), 1));
        }
      }
      
      if (params.adults !== undefined || params.children !== undefined) {
        sevValue({
          adults: params.adults ? Number(params.adults) : 1,
          children: params.children ? Number(params.children) : 0,
        }, 'guests');
      }
    }
  }, [params, sevValue])
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
    const nights = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    if(nights === 0) return null;
    return nights === 1 ? '1 night' : `${nights} nights`;
  }
  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex bg-white rounded-[30px]', className )}>
      <section className='flex py-3 pr-10 pl-7 w-full justify-between gap-[45px]'>

        <label className='w-2/3'>
          <div className='flex font-medium mb-2 gap-2 h-5 '>
            <div className=' pr-2 border-r-2 border-black pb-1'>Check In  </div>
            <div className='pb-1'>Check out</div>
          </div>
          <DateInput 
            value={dateRange || undefined}
            open={openCalendar}
            onOpenChange={setOpenCalendar}
          >
            <div className='flex gap-2 border-b pb-2'>
              <Calendar 
                required={false}
                mode="range"  
                captionLayout="label"
                selected={dateRange}
                onSelect={(date) => sevValue(date as DateRange, 'dateRange')}
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
                onSelect={(date) => sevValue(date as DateRange, 'dateRange')}
                month={nextMonth}
                onMonthChange={handleSecondaryMonthChange}
                disabled={{ 
                  before: new Date() 
                }}
              />
            </div>
            {getNights() &&
                <div className='font-semibold pt-5 pb-3'>
               {getNights()}
            </div>}
          </DateInput>
       </label>
        <Separator orientation="vertical" />
        <label className='w-1/3'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests setValue={(value) => sevValue(value, 'guests')} value={guests} />
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
