'use client'
import { BsCalendar2Fill } from 'react-icons/bs'
import { FiEdit2 } from 'react-icons/fi'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { Calendar } from '@/app/_components/ui/calendar'
import { Button } from '@/app/_components/ui/button'
import { DateRange } from 'react-day-picker'
import { useRouter, usePathname } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { getDate, getMinArrivalDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const ChangeDate = ({ arrival, departure }: { arrival: string, departure: string }) => {
  const t = useTranslations('changeDate')
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(arrival),
    to: new Date(departure)
  })

  const handleApply = () => {
    if (!dateRange?.from || !dateRange?.to) return
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', getDate(dateRange.from)!)
    params.set('to', getDate(dateRange.to)!)
    
    setOpen(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleCancel = () => {
    setDateRange({
      from: new Date(arrival),
      to: new Date(departure)
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className='flex px-2 gap-2 items-center font-bold'>
        <BsCalendar2Fill className='size-5 cursor-pointer self-center text-blue' /> 
        {dayjs(arrival).format('DD MMM YYYY')} - {dayjs(departure).format('DD MMM YYYY')}
        <PopoverTrigger asChild>
          <FiEdit2 className='size-5 cursor-pointer self-center ml-auto' />
        </PopoverTrigger>
      </div>
      
      <PopoverContent
        className="overflow-hidden rounded-[20px] bg-white p-4 flex flex-col w-[350px]"
        align="end"
        side="bottom"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="range"
          captionLayout="label"
          showOutsideDays={false}
          fixedWeeks={false}
          selected={dateRange}
          defaultMonth={dateRange?.from || new Date(arrival)}
          onSelect={(date) => {
            if (date?.from && !date?.to) {
              const nextDay = new Date(date.from);
              nextDay.setDate(nextDay.getDate() + 1);
              setDateRange({ from: date.from, to: nextDay });
            } else if (date?.from && date?.to) {
              // Check if same day selected
              if (date.from.getTime() === date.to.getTime()) {
                const nextDay = new Date(date.from);
                nextDay.setDate(nextDay.getDate() + 1);
                setDateRange({ from: date.from, to: nextDay });
              } else {
                setDateRange(date as DateRange);
              }
            } else {
              setDateRange(date as DateRange);
            }
          }}
          disabled={{ before: getMinArrivalDate() }}
        />
        
        <div className='grid grid-cols-2 gap-2 mt-4'>
          <Button onClick={handleCancel} variant='outline'>{t('cancel')}</Button>
          <Button onClick={handleApply} disabled={!dateRange?.from || !dateRange?.to}>{t('apply')}</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ChangeDate