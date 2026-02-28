'use client'
import { Button } from "@/app/_components/ui/button"
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog"
import { Input } from "@/app/_components/ui/input"
import { useState } from "react"
import { useTranslations } from 'next-intl'
import { usePreCheckIn } from "@/app/hooks/usePreCheckIn"

interface CheckInDialogProps {
  trigger: React.ReactNode
  onOpenChange?: (open: boolean) => void
}

const CheckInDialog = ({ trigger, onOpenChange }: CheckInDialogProps) => {
  const t = useTranslations('checkIn')
  const [isOpen, setIsOpen] = useState(false)
  const [reservationId, setReservationId] = useState('')
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (onOpenChange) {
      onOpenChange(open)
    }
  }

  const { data, isPending, error, mutate } = usePreCheckIn()

  const close = () => {
    setIsOpen(false)
    setReservationId('')
  }

  const handleSubmit = () => {
    if (reservationId.trim() === '') {
      return
    }
    console.log('🔍 Searching for reservation ID:', reservationId)
    mutate(reservationId, {
      onSuccess: (data) => {
        console.log('✅ Reservation found:', data)
      },
      onError: (error) => {
        console.error('❌ Error fetching reservation:', error)
      }
    })
  }

  const handleProceedToCheckIn = () => {
    if (data?.guestAppUrl) {
      window.open(data.guestAppUrl, '_blank')
    }
  }

  return (
    <ClientCustomDialog
      open={isOpen}
      setOpen={handleOpenChange}
      trigger={trigger}
      content={
        <div className='flex flex-col '>
        {!data && (
          <>
            <div className='text-gray-600 text-sm mb-6 text-center leading-relaxed   max-w-[400px]'>
              {t('subtitle')}
            </div>
            <div className='text-[15px] mb-2 text-dark inter'>{t('enterReservationId')}</div>
            <Input
              type='text'
              placeholder={`${t('enterReservationId')} (e.g. EXAMPLE-0)`}
              className='w-full max-w-[400px] h-10 rounded-full mb-10'
              value={reservationId}
              onChange={(e) => setReservationId(e.target.value)}
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPending) {
                  handleSubmit()
                }
              }}
            />
          </>
        )}

        {error && (
          <div className='text-red-500 text-sm mb-4 text-center'>
            {t('error')}
          </div>
        )}

        {data && !isPending && (
          <div className='mb-4'>
            <div className='text-green-600 font-semibold text-base mb-2 text-center'>
              {t('bookingFound')}
            </div>
            <div className='text-dark text-sm mb-6 text-center'>
              {t('reservationId')}: <span className='font-semibold'>{data.confirmationCode}</span>
            </div>
            {data.status === 'Canceled' ? (
              <div className='flex flex-col gap-2 text-center'>
                <p className='text-red-600 font-semibold text-sm'>{t('bookingCancelled')}</p>
                <p className='text-gray-500 text-sm'>{t('cannotProceedCheckIn')}</p>
                <Button variant='outline' className='w-full h-[45px] mt-2' onClick={close}>
                  {t('cancel')}
                </Button>
              </div>
            ) : (
            <Button 
              className='w-full h-[45px]' 
              onClick={handleProceedToCheckIn}
            >
              {t('proceedToCheckIn')}
            </Button>
            )}
          </div>
        )}
        
        {!data && (
          <div className='flex gap-4 items-center'>
            <Button 
              variant='outline' 
              className='flex-1 max-w-[190px] h-[45px]' 
              onClick={close}
              disabled={isPending}
            >
              {t('cancel')}
            </Button>
            <Button 
              className='flex-1 max-w-[190px] h-[45px]' 
              onClick={handleSubmit}
              disabled={isPending || reservationId.trim() === ''}
            >
              {isPending ? t('searching') : t('search')}
            </Button>
          </div>
        )}
      </div>
      }
      title={t('title')}
      className='w-[95%] max-w-lg !px-3 md:!px-10'
    />
  )
}

export default CheckInDialog
