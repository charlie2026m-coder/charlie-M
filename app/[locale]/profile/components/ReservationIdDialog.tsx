import { Button } from "@/app/_components/ui/button"
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog"
import { Input } from "@/app/_components/ui/input"
import { useState } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { useAddReservation } from '@/app/hooks/useAddReservation'
import { toast } from 'sonner'

const ReservationIdDialog = () => {
    const t = useTranslations('profile')
    const [isOpen, setIsOpen] = useState(false)
    const [isNotFound, setIsNotFound] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [reservationId, setReservationId] = useState('')
    const [error, setError] = useState<string | null>(null)
    const addReservation = useAddReservation()

    const close = () => {
      setIsOpen(false)
      setReservationId('')
      setIsNotFound(false)
      setIsSuccess(false)
      setError(null)
    }
    
    const handleSubmit = () => {
        if (reservationId.trim() === '') {
            setError(t('reservationNotFoundCheckId'))
            return
        }

        setError(null) // Clear previous error

        addReservation.mutate(reservationId, {
            onSuccess: () => {
                setIsSuccess(true)
                toast.success(t('reservationAddedSuccess'))
            },
            onError: (error) => {
                if (error.message.includes('not found')) {
                    setError(t('reservationNotFoundCheckId'))
                } else if (error.message.includes('already added')) {
                    toast.error(t('reservationAlreadyAdded') || 'Reservation already added')
                    setError(null)
                } else if (error.message.includes('email does not match')) {
                    toast.error(t('reservationEmailMismatch') || 'Reservation email does not match your account email')
                    setError(null)
                } else {
                    setError(t('reservationNotFoundCheckId'))
                }
            }
        })
    }

  return (
    <ClientCustomDialog
      open={isOpen}
      setOpen={setIsOpen}
      trigger={
        <div className='text-brown cursor-pointer hover:text-brown/80 transition-all duration-300'>
          {t('addViaReservationId')}
        </div>
      }
      content={
        isNotFound 
          ? <NotFound close={close} /> 
          : isSuccess 
            ? <Success close={close} /> 
            : <Form 
                reservationId={reservationId} 
                setReservationId={(value) => {
                  setReservationId(value)
                  if (error) setError(null) // Clear error when user types
                }} 
                handleSubmit={handleSubmit} 
                close={close} 
                isPending={addReservation.isPending} 
                error={error} 
              />
      }
      title={isNotFound ? t('notFound') : isSuccess ? t('success') : t('addViaReservationIdTitle')}
      className='w-auto !px-10'
    />
  )
}

export default ReservationIdDialog


const Form = ({ 
  reservationId,
  setReservationId,
  handleSubmit, 
  close,
  isPending,
  error
}: { reservationId: string, setReservationId: (reservationId: string) => void, handleSubmit: () => void, close: () => void, isPending: boolean, error: string | null }) => {
  const t = useTranslations('profile')

  return (
    <div className='w-full flex flex-col gap-10'>
      <div className='text-[15px] text-dark inter'>{t('enterReservationId')}</div>
      <Input
        type='text'
        placeholder={t('reservationIdPlaceholder')}
        className='w-[400px] h-10 rounded-full'
        value={reservationId}
        onChange={(e) => setReservationId(e.target.value)}
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isPending && reservationId.trim()) {
            handleSubmit()
          }
        }}
      />
      {error && (
        <div className='flex flex-col gap-2'>
          <div className='text-red-500 text-sm'>{error}</div>
          <div className='text-red-500 text-sm font-medium'>{t('reservationIdExample')}</div>
        </div>
      )}
      <div className='flex gap-4 items-center'>
        <Button variant='outline' className='flex-1 max-w-[190px] h-[45px]' onClick={close} disabled={isPending}>{t('cancel')}</Button>
        <Button className='flex-1 max-w-[190px] h-[45px]' onClick={handleSubmit} disabled={isPending || reservationId.trim() === ''}>
          {isPending ? t('adding') || 'Adding...' : t('add')}
        </Button>
      </div>

    </div>
  )
}

const NotFound = ({ close }: { close: () => void }) => {
  const t = useTranslations('profile')
  
  return (
    <div className='w-full flex flex-col '>
      <div className='text-[15px] text-dark inter mb-6  text-center'>{t('nothingFound')}</div>
      <Image
        src='/images/not-found-guy.svg' 
        alt='not-found' 
        width={120} 
        height={240} 
        className='w-[120px] object-cover mx-auto mb-5' 
      />
      <Button className='w-full  h-[45px]' onClick={close}>{t('ok')}</Button>
    </div>
  )
}

const Success = ({ close }: { close: () => void }) => {
  const t = useTranslations('profile')
  
  return (
    <div className='w-full flex flex-col '>
      <div className='text-[15px] text-dark inter mb-6  text-center'>{t('reservationAddedSuccess')}</div>
     
      <Button className='w-full  h-[45px]' onClick={close}>{t('ok')}</Button>
    </div>
  )
}