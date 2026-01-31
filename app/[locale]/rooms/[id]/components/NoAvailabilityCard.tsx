'use client'

import { Button } from '@/app/_components/ui/button'
import { useRouter } from '@/navigation'
import { FiAlertCircle } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

interface NoAvailabilityCardProps {
  from?: string
  to?: string
  roomName?: string
}

const NoAvailabilityCard = ({ from, to, roomName }: NoAvailabilityCardProps) => {
  const router = useRouter()
  const t = useTranslations('noAvailability')
  
  // Check if custom dates are provided
  const hasCustomDates = Boolean(from && to)
  
  const handleChangeSearch = () => {
    router.push('/rooms')
  }

  return (
    <div className='flex flex-col items-center justify-center py-16 px-6 bg-white rounded-[20px] border col-span-2 xl:col-span-3'>
      <div className='flex flex-col items-center max-w-md text-center'>
        <div className='w-20 h-20 rounded-full bg-orange/10 flex items-center justify-center mb-6'>
          <FiAlertCircle className='w-10 h-10 text-orange' />
        </div>
        
        <h2 className='text-2xl font-bold mb-3'>
          {t('title')}
        </h2>
        
        <p className='text-dark mb-6 text-base'>
          {roomName ? t('roomNameIs', { roomName }) : t('roomIs')} {t('notAvailable')} 
          {hasCustomDates ? ` ${t('forSelectedDates')}` : ` ${t('forTodayTomorrow')}`}. 
          {t('tryDifferentDates')}
        </p>
        

        
        <Button 
          onClick={handleChangeSearch}
          className='w-full max-w-xs h-12'
        >
          {t('lookAnother')}
        </Button>
      </div>
    </div>
  )
}

export default NoAvailabilityCard
