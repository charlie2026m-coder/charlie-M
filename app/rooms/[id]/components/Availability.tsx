'use client'
import { Button } from '@/app/_components/ui/button'
import { Calendar } from '@/app/_components/ui/calendar'
import Dot from '@/app/_components/ui/dot'
import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { DateRange } from 'react-day-picker'

const Availability = ({ availability = {} }: { availability: Record<string, Record<string, boolean>> }) => {
  console.log(availability, 'availability')
  
  const { available, booked } = useMemo(() => {
    const availableDates: Date[] = [];
    const bookedDates: Date[] = [];

    Object.keys(availability).forEach((key, index) => {
      const date = dayjs(key).toDate();
      date.setHours(0, 0, 0, 0); 
      
      if (availability[key]) {
        availableDates.push(date); 
      } else {
        bookedDates.push(date); 
      }
    });

    return { available: availableDates, booked: bookedDates };
  }, [availability]);
  
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)

  const handlePrimaryMonthChange = (month: Date) => {
    setCurrentMonth(new Date(month.getFullYear(), month.getMonth(), 1))
  }

  const handleSecondaryMonthChange = (month: Date) => {
    const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)
    setCurrentMonth(previousMonth)
  }



  return (
    <div className='flex flex-col'>
      <div className='flex items-center gap-2.5 text-2xl font-semibold mb-[30px]'>
        <Dot size={20} color='blue' />
        Availability
      </div>

      <div className='flex  gap-6 border-b pb-[30px] mb-[30px]'>
        <div className='bg-white w-full shadow-lg rounded-[20px] p-2'>
          <Calendar 
            required={false}
            mode="range"  
            captionLayout="label"
            selected={selectedRange}
            onSelect={setSelectedRange}
            disabled={booked}
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
            disabled={booked}
            month={nextMonth}
            onMonthChange={handleSecondaryMonthChange}
            modifiers={{  booked: booked }}
            modifiersClassNames={{ 
              booked: "!bg-red-400 !text-black opacity-100" 
            }}
            
          />
        </div>
      </div>
      <div className='flex items-center justify-end gap-2'>
        <Button variant='outline' className='h-[55px] w-[160px]'>Cancel</Button>
        <Button className='h-[55px] w-[160px]'>Apply </Button>
      </div>
    </div>
  )
}

export default Availability