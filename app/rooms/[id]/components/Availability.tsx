'use client'
import { Button } from '@/app/_components/ui/button'
import { Calendar } from '@/app/_components/ui/calendar'
import Dot from '@/app/_components/ui/dot'
import { useState } from 'react'

const Availability = () => {

  const available:Date[] = [
    new Date('2025-11-15'), 
    new Date('2025-11-20'), 
    new Date('2025-11-25'), 
    new Date('2025-11-30'),
    new Date('2025-12-05'),
    new Date('2025-12-10'),
    new Date('2025-12-15'),
    new Date('2025-12-20'),
    new Date('2025-12-25'),
  ]
  
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
            mode="multiple"  
            captionLayout="label"
            selected={available}
            disabled={{ before: new Date() }}
            month={currentMonth}
            onMonthChange={handlePrimaryMonthChange}
          />
        </div>
        <div className='bg-white w-full shadow-lg rounded-[20px] p-2'>
          <Calendar 
            required={false}
            mode="multiple"  
            captionLayout="label"
            selected={available}
            disabled={{ before: new Date() }}
            month={nextMonth}
            onMonthChange={handleSecondaryMonthChange}
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