'use client'

import { Button } from '@/app/_components/ui/button'
import { useRouter } from '@/navigation'
import dayjs from 'dayjs'
import { BsCalendar2Fill } from 'react-icons/bs'
import { FiAlertCircle } from 'react-icons/fi'

interface NoAvailabilityCardProps {
  from?: string
  to?: string
  roomName?: string
}

const NoAvailabilityCard = ({ from, to, roomName }: NoAvailabilityCardProps) => {
  const router = useRouter()
  
  // Format dates or use default (today - tomorrow)
  const hasCustomDates = Boolean(from && to)
  const checkInDate = from ? dayjs(from) : dayjs()
  const checkOutDate = to ? dayjs(to) : dayjs().add(1, 'day')
  
  const formattedCheckIn = checkInDate.format('MMM DD, YYYY')
  const formattedCheckOut = checkOutDate.format('MMM DD, YYYY')
  
  const handleChangeSearch = () => {
    router.push('/rooms')
  }

  return (
    <div className='flex flex-col items-center justify-center py-16 px-6 bg-white rounded-[20px] border col-span-2 xl:col-span-3'>
      <div className='flex flex-col items-center max-w-md text-center'>
        {/* Icon */}
        <div className='w-20 h-20 rounded-full bg-orange/10 flex items-center justify-center mb-6'>
          <FiAlertCircle className='w-10 h-10 text-orange' />
        </div>
        
        {/* Title */}
        <h2 className='text-2xl font-bold mb-3'>
          No Rooms Available
        </h2>
        
        {/* Message */}
        <p className='text-dark mb-6 text-base'>
          {roomName ? `${roomName} is` : 'This room is'} not available 
          {hasCustomDates ? ' for the selected dates' : ' for today and tomorrow'}. 
          Please try different dates or explore other room options.
        </p>
        

        
        {/* Action Button */}
        <Button 
          onClick={handleChangeSearch}
          className='w-full max-w-xs h-12'
        >
          Look another
        </Button>
      </div>
    </div>
  )
}

export default NoAvailabilityCard
