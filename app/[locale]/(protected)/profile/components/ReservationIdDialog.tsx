import { Button } from "@/app/_components/ui/button"
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog"
import { Input } from "@/app/_components/ui/input"
import { useState, type ReactNode } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { useAddReservation } from '@/app/hooks/useAddReservation'
import { toast } from 'sonner'
import { ReservationIdHelp } from "@/app/_components/Auth/ReservationIdHelp"

const ReservationIdDialog = ({ trigger }: { trigger?: ReactNode }) => {
    const t = useTranslations('profile')
    const [isOpen, setIsOpen] = useState(false)
    const [isNotFound, setIsNotFound] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [reservationId, setReservationId] = useState('')
    const [lastName, setLastName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const addReservation = useAddReservation()

    const close = () => {
      setIsOpen(false)
      setReservationId('')
      setLastName('')
      setIsNotFound(false)
      setIsSuccess(false)
      setError(null)
    }

    const handleSubmit = () => {
        if (reservationId.trim() === '' || lastName.trim() === '') {
            setError(t('reservationNotFoundCheckId'))
            return
        }

        setError(null)

        addReservation.mutate({ reservationId: reservationId.trim(), lastName: lastName.trim() }, {
            onSuccess: () => {
                setIsSuccess(true)
                toast.success(t('reservationAddedSuccess'))
            },
            onError: (error) => {
                if (error.message === 'BOOKING_ID_OR_NAME_INVALID') {
                    setIsNotFound(true)
                    setError(null)
                } else if (error.message === 'ALREADY_ADDED') {
                    setError(t('reservationAlreadyAdded'))
                    toast.error(t('reservationAlreadyAdded'))
                } else if (error.message === 'TOO_MANY_ATTEMPTS') {
                    setError(t('tooManyAttempts'))
                    toast.error(t('tooManyAttempts'))
                } else if (error.message === 'EMAIL_BELONGS_TO_USER') {
                    setError(t('reservationBelongsToEmail'))
                    toast.error(t('reservationBelongsToEmail'))
                } else if (error.message === 'SERVER_ERROR') {
                    setError(t('serverErrorTryAgain'))
                    toast.error(t('serverErrorTryAgain'))
                } else {
                    setError(t('serverErrorTryAgain'))
                    toast.error(t('serverErrorTryAgain'))
                }
            }
        })
    }

  return (
    <ClientCustomDialog
      open={isOpen}
      setOpen={setIsOpen}
      trigger={
        trigger ?? (
          <div className='text-brown cursor-pointer hover:text-brown/80 transition-all duration-300 pl-1'>
            {t('addViaReservationId')}
          </div>
        )
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
                  if (error) setError(null)
                }}
                lastName={lastName}
                setLastName={(value) => {
                  setLastName(value)
                  if (error) setError(null)
                }}
                handleSubmit={handleSubmit}
                close={close}
                isPending={addReservation.isPending}
                error={error}
              />
      }
      title={isNotFound ? t('notFound') : isSuccess ? t('success') : t('addViaReservationIdTitle')}
      className='w-[95%]  max-w-lg px-3 md:!px-10'
    />
  )
}

export default ReservationIdDialog


const Form = ({
  reservationId,
  setReservationId,
  lastName,
  setLastName,
  handleSubmit,
  close,
  isPending,
  error
}: { reservationId: string, setReservationId: (reservationId: string) => void, lastName: string, setLastName: (lastName: string) => void, handleSubmit: () => void, close: () => void, isPending: boolean, error: string | null }) => {
  const t = useTranslations('profile')

  return (
    <div className='w-full flex flex-col'>
      <div className='text-[15px] text-dark inter mb-2'>{t('enterReservationId')}</div>
      <ReservationIdHelp className='mb-4' />
      <Input
        type='text'
        placeholder={`${t('reservationIdPlaceholder')} (e.g. EXAMPLEID-0)`}
        className='w-full h-10 rounded-full mb-4'
        value={reservationId}
        onChange={(e) => setReservationId(e.target.value)}
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isPending && reservationId.trim() && lastName.trim()) {
            handleSubmit()
          }
        }}
      />
      <Input
        type='text'
        placeholder={t('enterLastName')}
        className='w-full h-10 rounded-full mb-12'
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isPending && reservationId.trim() && lastName.trim()) {
            handleSubmit()
          }
        }}
      />
        {error && (
          <div className='text-red-500 text-sm text-center break-words whitespace-normal max-w-[400px] absolute bottom-19'>
            {error === t('checkBookingId') ? `${error} ${t('reservationIdExample')}` : error}
          </div>
        )}
      <div className='flex gap-4 items-center justify-center'>
        <Button variant='outline' className='flex-1 max-w-[190px] h-[45px]' onClick={close} disabled={isPending}>{t('cancel')}</Button>
        <Button className='flex-1 max-w-[190px] h-[45px]' onClick={handleSubmit} disabled={isPending || reservationId.trim() === '' || lastName.trim() === ''}>
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
