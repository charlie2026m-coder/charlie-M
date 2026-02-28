'use client'
import { Button } from "@/app/_components/ui/button"
import { Input } from "@/app/_components/ui/input"
import { useState } from "react"
import { useTranslations } from 'next-intl'
import { usePreCheckIn } from "@/app/hooks/usePreCheckIn"

const MobileCheckInForm = () => {
  const t = useTranslations('checkIn')
  const tRoot = useTranslations()
  const [showForm, setShowForm] = useState(false)
  const [reservationId, setReservationId] = useState('')
  const { data, isPending, error, mutate, reset: resetMutation } = usePreCheckIn()

  const handleSubmit = () => {
    if (reservationId.trim() === '') {
      return
    }
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

  const handleReset = () => {
    resetMutation()
    setShowForm(false)
    setReservationId('')
  }

  if (data && !isPending) {
    return (
      <div className='w-full flex flex-col gap-4'>
        <div className='text-dark text-sm text-center'>
          {t('reservationId')}: <span className='font-semibold'>{data.confirmationCode}</span>
        </div>
        {data.status === 'Canceled' ? (
          <div className='flex flex-col gap-2 text-center'>
            <p className='text-red-600 font-semibold text-sm'>{t('bookingCancelled')}</p>
            <p className='text-gray-500 text-sm'>{t('cannotProceedCheckIn')}</p>
            <Button 
              variant='outline' 
              className='w-full h-[55px]' 
              onClick={handleReset}
            >
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <>
        <Button 
          className='w-full h-[55px]' 
          onClick={handleProceedToCheckIn}
        >
          {t('proceedToCheckIn')}
        </Button>
        <Button 
          variant='outline' 
          className='w-full h-[55px]' 
          onClick={handleReset}
        >
          {t('cancel')}
        </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className='w-full flex flex-col gap-4'>
      {!showForm ? (
        <Button 
          variant='outline' 
          className='w-full h-[55px] border-none'
          onClick={() => setShowForm(true)}
        >
          {tRoot('check_in_btn')}
        </Button>
      ) : (
        <div className='w-full flex flex-col items-center'>
          <div className='font-semibold mb-2'>{t('title')}</div>
          <div className='text-gray-600 text-xs leading-relaxed mb-2'>
            {t('subtitle')}
          </div>
          <div className='text-xs self-start mb-2 text-dark inter'>{t('enterReservationId')}</div>
          <Input
            type='text'
            placeholder="XXXXXX-0"
            className='w-full h-10 rounded-full mb-2'
            value={reservationId}
            onChange={(e) => setReservationId(e.target.value)}
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isPending) {
                handleSubmit()
              }
            }}
          />
          {error && (
            <div className='text-red-500 text-sm text-center'>
              {t('error')}
            </div>
          )}
          <div className='flex gap-4 '>
            <Button 
              variant='outline' 
              className='flex-1 h-[45px]' 
              onClick={handleReset}
              disabled={isPending}
            >
              {t('cancel')}
            </Button>
            <Button 
              className='flex-1 h-[45px]' 
              onClick={handleSubmit}
              disabled={isPending || reservationId.trim() === ''}
            >
              {isPending ? t('searching') : t('search')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileCheckInForm
