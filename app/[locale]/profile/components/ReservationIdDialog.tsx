import { Button } from "@/app/_components/ui/button"
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog"
import { Input } from "@/app/_components/ui/input"
import { useState } from "react"
import Image from "next/image"
import { useTranslations } from 'next-intl'

const ReservationIdDialog = () => {
    const t = useTranslations('profile')
    const [isOpen, setIsOpen] = useState(false)
    const [isNotFound, setIsNotFound] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [reservationId, setReservationId] = useState('')

    const close = () => {
      setIsOpen(false)
      setReservationId('')
      setIsNotFound(false)
      setIsSuccess(false)
    }
    const handleSubmit = () => {
        if (reservationId.trim() === '') {
            setIsNotFound(true)
        } else {
            setIsSuccess(true)
        }
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
            : <Form reservationId={reservationId} setReservationId={setReservationId} handleSubmit={handleSubmit} close={close} />
      }
      title={isNotFound ? t('notFound') : isSuccess ? t('success') : t('addViaReservationIdTitle')}
    />
  )
}

export default ReservationIdDialog


const Form = ({ 
  reservationId,
  setReservationId,
  handleSubmit, 
  close 
}: { reservationId: string, setReservationId: (reservationId: string) => void, handleSubmit: () => void, close: () => void }) => {
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
      />
      <div className='flex gap-4 items-center'>
        <Button variant='outline' className='flex-1 max-w-[190px] h-[45px]' onClick={close}>{t('cancel')}</Button>
        <Button className='flex-1 max-w-[190px] h-[45px]' onClick={handleSubmit}>{t('add')}</Button>
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
      <Image
        src='/images/success-guy.svg' 
        alt='not-found' 
        width={120} 
        height={240} 
        className='w-[120px] object-cover mx-auto mb-5' 
      />
      <Button className='w-full  h-[45px]' onClick={close}>{t('ok')}</Button>
    </div>
  )
}