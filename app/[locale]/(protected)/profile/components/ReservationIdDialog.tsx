import { Button } from "@/app/_components/ui/button"
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog"
import { Input } from "@/app/_components/ui/input"
import { useState, type ReactNode } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { useAddReservation } from '@/app/hooks/useAddReservation'
import { toast } from 'sonner'
import { FiHelpCircle } from "react-icons/fi"
import { FaWhatsapp } from "react-icons/fa"
import { PHONE_NUMBER } from "@/lib/Constants"

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
  const [showHelp, setShowHelp] = useState(false)
  const whatsappHref = `https://wa.me/${PHONE_NUMBER.replace(/\D/g, '')}`

  return (
    <div className='w-full flex flex-col'>
      <div className='flex items-center gap-2 mb-3'>
        <span className='text-[15px] text-dark inter'>{t('enterReservationId')}</span>
        <button
          type='button'
          onClick={() => setShowHelp((v) => !v)}
          aria-label={t('whereToFindId')}
          aria-expanded={showHelp}
          className='text-brown hover:text-brown/70 transition-colors'
        >
          <FiHelpCircle className='size-4' />
        </button>
      </div>
      {showHelp && (
        <div className='mb-4 rounded-2xl bg-light-bg p-3.5 text-sm text-mute'>
          <p className='font-semibold mb-1 text-dark'>{t('whereToFindIdTitle')}</p>
          <p className='mb-3 leading-relaxed'>{t('whereToFindIdText')}</p>
          <a
            href={whatsappHref}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-full border border-[#25D366] px-3 py-1.5 text-sm font-medium text-mute transition-colors hover:bg-[#25D366]/10'
          >
            <FaWhatsapp className='size-4 text-[#25D366]' />
            {t('cantFindIdWhatsapp')}
          </a>
        </div>
      )}
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
