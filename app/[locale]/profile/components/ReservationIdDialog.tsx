import { Button } from "@/app/_components/ui/button"
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog"
import { Input } from "@/app/_components/ui/input"
import { useState } from "react"
import Image from "next/image"

const ReservationIdDialog = () => {
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
          + Add via Reservation ID
        </div>
      }
      content={
        isNotFound 
          ? <NotFound close={close} /> 
          : isSuccess 
            ? <Success close={close} /> 
            : <Form reservationId={reservationId} setReservationId={setReservationId} handleSubmit={handleSubmit} close={close} />
      }
      title={isNotFound ? 'Not Found' : isSuccess ? 'Success' : 'Add via Reservation ID'}
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

  return (
    <div className='w-full flex flex-col gap-10'>
      <div className='text-[15px] text-dark inter'>Enter your Reservation ID (or booking.com code) </div>
      <Input
        type='text'
        placeholder='Reservation ID/Code'
        className='w-[400px] h-10 rounded-full'
        value={reservationId}
        onChange={(e) => setReservationId(e.target.value)}
      />
      <div className='flex gap-4 items-center'>
        <Button variant='outline' className='flex-1 max-w-[190px] h-[45px]' onClick={close}>Cancel</Button>
        <Button className='flex-1 max-w-[190px] h-[45px]' onClick={handleSubmit}>Add</Button>
      </div>

    </div>
  )
}

const NotFound = ({ close }: { close: () => void }) => {
  return (
    <div className='w-full flex flex-col '>
      <div className='text-[15px] text-dark inter mb-6  text-center'>Nothing found for this Reservation ID number. Please, check and try again.</div>
      <Image
        src='/images/not-found-guy.svg' 
        alt='not-found' 
        width={120} 
        height={240} 
        className='w-[120px] object-cover mx-auto mb-5' 
      />
      <Button className='w-full  h-[45px]' onClick={close}>Ok</Button>
    </div>
  )
}

const Success = ({ close }: { close: () => void }) => {
  return (
    <div className='w-full flex flex-col '>
      <div className='text-[15px] text-dark inter mb-6  text-center'>Your reservation has been successfully added</div>
      <Image
        src='/images/success-guy.svg' 
        alt='not-found' 
        width={120} 
        height={240} 
        className='w-[120px] object-cover mx-auto mb-5' 
      />
      <Button className='w-full  h-[45px]' onClick={close}>Ok</Button>
    </div>
  )
}