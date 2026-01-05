'use client'
import { Button } from '@/app/_components/ui/button'
import { Calendar } from '@/app/_components/ui/calendar'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { DateRange } from 'react-day-picker'
import { getDate, getPath } from '@/lib/utils'
import { useRouter } from '@/navigation'
import { useStore } from '@/store/useStore'

const Availability = ({ from, to, children, adults, id }: { from?: string, to?: string, children?: string, adults?: string, id: string }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)

  const router = useRouter();
  const dateRange = useStore(state => state.dateRange);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: dateRange.from ? dateRange.from : (from ? dayjs(from).toDate() : undefined),
    to: dateRange.to ? dateRange.to : (to ? dayjs(to).toDate() : undefined),
  });

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setSelectedRange({
        from: dateRange.from,
        to: dateRange.to,
      });
    }
  }, [dateRange?.from, dateRange?.to]);

  const handlePrimaryMonthChange = (month: Date) => setCurrentMonth(new Date(month.getFullYear(), month.getMonth(), 1))
  const handleSecondaryMonthChange = (month: Date) => setCurrentMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))


  const cancel = () => {
    setSelectedRange({
      from: dateRange?.from || (from ? dayjs(from).toDate() : undefined),
      to: dateRange?.to || (to ? dayjs(to).toDate() : undefined),
    });
  }

  const apply = () =>{
    if (!selectedRange?.from || !selectedRange?.to) return;
    const queryString = getPath({ 
      from: getDate(selectedRange?.from), 
      to: getDate(selectedRange?.to), 
      adults: adults?.toString() || '1', 
      children: children?.toString() || '0'  
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
            disabled={{ before: today }}
            month={currentMonth}
            onMonthChange={handlePrimaryMonthChange}
            
          />
        </div>
        <div className='bg-white w-full shadow-lg rounded-[20px] p-2'>
          <Calendar 
            required={false}
            mode="range"  
            captionLayout="label"
            selected={selectedRange}
            onSelect={setSelectedRange}
            disabled={{ before: today }}
            month={nextMonth}
            onMonthChange={handleSecondaryMonthChange}
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