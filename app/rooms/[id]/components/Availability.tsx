'use client'
import { Button } from '@/app/_components/ui/button'
import { Calendar } from '@/app/_components/ui/calendar'
import Dot from '@/app/_components/ui/dot'
import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { DateRange } from 'react-day-picker'
import { Availability as AvailabilityType, UrlParams } from '@/types/beds24'
import { getDate, getPath } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'


const Availability = ({ params, availability = {} as AvailabilityType, id }: { params: UrlParams, availability: AvailabilityType, id: string }) => {
  const router = useRouter();
  const { dateRange } = useStore();
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: params.from ? new Date(params.from) : dateRange?.from,
    to: params.to ? new Date(params.to) : dateRange?.to,
  });
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)

  const handlePrimaryMonthChange = (month: Date) => {
    setCurrentMonth(new Date(month.getFullYear(), month.getMonth(), 1))
  }

  const handleSecondaryMonthChange = (month: Date) => {
    const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)
    setCurrentMonth(previousMonth)
  }


  const { booked } = useMemo(() => {
    const availableDates: Date[] = [];
    const bookedDates: Date[] = [];

    Object.keys(availability).forEach((key) => {
      const date = dayjs(key).toDate();
      date.setHours(0, 0, 0, 0); 
      
      if (availability[key] === true) {
        availableDates.push(date); 
      } else {
        bookedDates.push(date); 
      }
    });

    return { available: availableDates, booked: bookedDates };
  }, [availability]);


  const cancel = () => {
    setSelectedRange({
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
    });
  }

  const apply = () =>{
    if (!selectedRange?.from || !selectedRange?.to) return;
    const queryString = getPath({ 
      from: getDate(selectedRange?.from), 
      to: getDate(selectedRange?.to), 
      adults: params.adults?.toString() || '1', 
      children: params.children?.toString() || '0' 
    });
    router.push(`/rooms/${id}?${queryString}`);
  }


  return (
    <div className='flex flex-col'>
      <div className='flex items-center gap-2.5 text-2xl font-semibold mb-[30px]'>
        Availability
      </div>

      <div className='flex flex-col md:flex-row gap-6 border-b pb-[30px] mb-[30px]'>
        <div className='bg-white w-full shadow-lg rounded-[20px] p-2'>
          <Calendar 
            required={false}
            mode="range"  
            captionLayout="label"
            selected={selectedRange}
            onSelect={setSelectedRange}
            disabled={[
              { before: new Date() },
              ...booked
            ]}
            month={currentMonth}
            onMonthChange={handlePrimaryMonthChange}
            modifiers={{ 
              // highlighted: available, 
              booked: booked }}
            modifiersClassNames={{ 
              // highlighted: "!bg-green-100 text-dark font-semibold", 
              booked: "!bg-red-400 !text-black opacity-100" 
            }}
          />
        </div>
        <div className='bg-white w-full shadow-lg rounded-[20px] p-2'>
          <Calendar 
            required={false}
            mode="range"  
            captionLayout="label"
            selected={selectedRange}
            onSelect={setSelectedRange}
            disabled={[
              { before: new Date() },
              ...booked
            ]}
            month={nextMonth}
            onMonthChange={handleSecondaryMonthChange}
            modifiers={{  booked: booked }}
            modifiersClassNames={{ 
              booked: "!bg-red-400 !text-black opacity-100" 
            }}
          />
        </div>
      </div>
      <div className='flex items-center justify-between md:justify-end gap-2'>
        <Button  variant='outline' className='h-[55px] w-[160px]' onClick={cancel}>Cancel</Button>
        <Button className='h-[55px] w-[160px]' onClick={apply}>Apply </Button>
      </div>
    </div>
  )
}

export default Availability