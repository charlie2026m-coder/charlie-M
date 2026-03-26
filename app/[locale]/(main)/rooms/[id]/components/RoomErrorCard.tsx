'use client'

import { Button } from '@/app/_components/ui/button'
import { useRouter } from '@/navigation'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

const RoomErrorCard = () => {
  const router = useRouter()
  const t = useTranslations()
  
  const handleReload = () => {
    window.location.reload()
  }

  const handleBackToRooms = () => {
    router.push('/rooms')
  }

  return (
    <div className='flex flex-col items-center justify-center py-16 px-6 bg-white w-full'>
      <div className='flex flex-col items-center  text-center'>
        <h2 className='text-2xl font-bold mb-3'>
          {t('errors.roomLoadError')}
        </h2>
        
        <p className='text-dark mb-6 text-base'>
          {t('errors.pleaseTryAgain')}
        </p>
        
        <div className='flex gap-3 w-full '>
          <Button 
            onClick={handleBackToRooms}
            variant='outline'
            className='flex-1 h-12'
          >
            {t('errors.backToRooms')}
          </Button>
          <Button 
            onClick={handleReload}
            variant='default'
            className='flex-1 h-12'
          >
            {t('errors.reloadPage')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RoomErrorCard
