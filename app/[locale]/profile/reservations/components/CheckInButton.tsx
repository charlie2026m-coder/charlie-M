'use client'
import { Button } from '@/app/_components/ui/button'
import { useTranslations } from 'next-intl'
import { usePreCheckIn } from '@/app/hooks/usePreCheckIn'
import { useState } from 'react'
import { toast } from 'sonner'

interface CheckinButtonProps {
  reservationId: string
}

export const CheckinButton = ({ reservationId }: CheckinButtonProps) => {
  const t = useTranslations('profile')
  const { mutate, isPending } = usePreCheckIn()
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckIn = () => {
    if (isLoading || isPending) return

    setIsLoading(true)
    mutate(reservationId, {
      onSuccess: (data) => {
        if (data?.guestAppUrl) {
          window.open(data.guestAppUrl, '_blank')
          toast.success(t('redirectingToCheckIn') || 'Redirecting to check-in...')
        } else {
          toast.error(t('checkInUrlNotFound') || 'Check-in URL not found')
        }
        setIsLoading(false)
      },
      onError: (error) => {
        console.error('Error fetching check-in:', error)
        toast.error(t('checkInError') || 'Failed to start check-in process')
        setIsLoading(false)
      }
    })
  }

  return (
    <Button 
      variant='outline' 
      className='h-[30px] border-red text-red hover:bg-red hover:text-white text-sm px-3'
      onClick={handleCheckIn}
      disabled={isLoading || isPending}
    >
      {isLoading || isPending ? t('loading') || 'Loading...' : t('completeCheckIn')}
    </Button>
  )
}