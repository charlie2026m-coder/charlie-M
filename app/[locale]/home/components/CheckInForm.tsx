'use client';
import { cn, getDate, getPath } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Separator } from '@/app/_components/ui/separator';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '@/app/_components/ui/DateInput';
import { Guests } from '@/app/_components/ui/guests';
import { Calendar } from '@/app/_components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Button } from '@/app/_components/ui/button'
import { useRouter } from 'next/navigation';  
import { useStore } from '@/store/useStore';
import { UrlParams } from '@/types/apaleo';


const CheckInForm = ({ className = '', params }: { className?: string, params?: UrlParams }) => {
  const { dateRange, guests, setValue } = useStore();
  const router = useRouter();
  const [openCalendar, setOpenCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateError, setDateError] = useState(false);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  useEffect(() => {
    if (params) {
      if (params.from && params.to) {
        const fromDate = new Date(params.from);
        const toDate = new Date(params.to);
        
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setValue({  from: fromDate,  to: toDate }, 'dateRange');
          
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
    
    const hasDateError = !dateRange?.from || !dateRange?.to;
    setDateError(hasDateError);
    
    if (hasDateError) {
      return;
    }
    
    const queryString = getPath({
      from: getDate(dateRange.from!),
      to: getDate(dateRange.to!),
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
    
    // Ensure we're working with Date objects
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    
    // Calculate difference in milliseconds and convert to days, using Math.round to avoid float numbers
    const diffTime = toDate.getTime() - fromDate.getTime();
    const nights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
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
      data-checkin-form="original"
      className={cn('flex flex-row pl-3 md:pl-8 gap-2 md:gap-8  w-full max-w-[900px] bg-white p-3 rounded-full items-center', className )}
    >

        <label className='w-full max-w-3/5'>
          <DateInput 
            value={dateRange || undefined}
            open={openCalendar}
            onOpenChange={(open) => {
              setOpenCalendar(open);
              if (open && dateError) {
                setDateError(false);
              }
            }}
            isError={dateError}
          >
            <div className='flex flex-col md:flex-row gap-2  pb-2 '>
              <Calendar 
                required={false}
                mode="range"  
                captionLayout="label"
                selected={dateRange}
                onSelect={(date) => {
                  setValue(date as DateRange, 'dateRange');
                  if (date?.from && date?.to && dateError) {
                    setDateError(false);
                  }
                }}
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
                onSelect={(date) => {
                  setValue(date as DateRange, 'dateRange');
                  if (date?.from && date?.to && dateError) {
                    setDateError(false);
                  }
                }}
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
              <Button onClick={resetForm} className='w-full text-sm md:text-base h-10' variant='outline'>Cancel</Button>
              <Button onClick={()=> setOpenCalendar(false)} className='w-full text-sm md:text-base h-10'>Apply</Button>
            </div>
          </DateInput>
       </label>
        <label className='w-full max-w-2/5 border-l md:border-none'>
          <Guests setValue={(value) => setValue(value, 'guests')} value={guests} />
        </label>
        <Button
          className={cn('cursor-pointer size-10  md:size-15 flex items-center justify-center rounded-full transition-all duration-300 bg-blue hover:bg-blue/80')}
          type='submit'
          size="icon"
        >
          <RiSearchLine className='text-mute size-5 md:size-8' />
        </Button>
    </form>
  );
};

export default CheckInForm;
