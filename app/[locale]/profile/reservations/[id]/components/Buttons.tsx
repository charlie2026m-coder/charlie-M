'use client'
import { Button } from "@/app/_components/ui/button";
import { BsCheckCircleFill } from "react-icons/bs";
import { IoCard } from "react-icons/io5";
import { RiSofaFill } from "react-icons/ri";
import { FaCalendar } from "react-icons/fa";
import { Link } from "@/navigation";
import { Reservation } from "@/types/apaleo";
import dayjs from "dayjs";
import { useAddExtrasStore } from "@/store/useAddExtras";
import { cn } from "@/lib/utils";
import { usePreCheckIn } from '@/app/hooks/usePreCheckIn'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface CheckinButtonProps {
  reservationId: string
}

export const CheckinButton = ({ reservationId }: CheckinButtonProps) => {
  const t = useTranslations('profile')
  const tCheckIn = useTranslations('checkIn')
  const { mutate, isPending } = usePreCheckIn()
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckIn = () => {
    if (isLoading || isPending) return

    setIsLoading(true)
    mutate(reservationId, {
      onSuccess: (data) => {
        if (data?.status === 'Canceled') {
          toast.error(tCheckIn('cannotProceedCheckIn') || 'Online check-in is not available for cancelled bookings.')
          setIsLoading(false)
          return
        }
        
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
      className='h-[35px] border-red text-red hover:bg-red hover:text-white text-sm px-5 gap-2 justify-start'
      onClick={handleCheckIn}
      disabled={isLoading || isPending}
    >
      <BsCheckCircleFill /> 
      {isLoading || isPending ? t('loading') || 'Loading...' : t('completeCheckIn')}
    </Button>
  )
}

export const ReservationButton = () => {
  return (
    <Button variant='outline' className='h-[35px]  text-sm px-5 gap-2 justify-start'><IoCard />Reservation Details</Button>
  )
}

export const RoomButton = () => {
  return (
    <Button variant='outline' className='h-[35px] text-sm px-5 gap-2 justify-start'><RiSofaFill />Room info</Button>
  )
}

export const ExtendButton = () => {
  const { setOpenExtendYourStay, openExtendYourStay } = useAddExtrasStore();
  return (
    <Button 
      variant='outline' 
      className={cn('h-[35px] text-sm px-5 gap-2 justify-start', openExtendYourStay ? 'bg-blue text-white border-blue hover:bg-blue/90 hover:text-white' : 'hover:bg-gray-50')}
      onClick={() => setOpenExtendYourStay(!openExtendYourStay)}
    >
      <FaCalendar />Extend Your Stay
    </Button>
  )
}

export const BookAgainButton = ({ reservation }: { reservation: Reservation }) => {
  const tomorrow = dayjs().add(1, 'day');
  const arrivalDate = dayjs(reservation.arrival);
  
  // If arrival date is before tomorrow, use tomorrow/day after tomorrow
  const from = arrivalDate.isBefore(tomorrow) 
    ? tomorrow.format('YYYY-MM-DD')
    : arrivalDate.format('YYYY-MM-DD');
    
  const to = arrivalDate.isBefore(tomorrow)
    ? tomorrow.add(1, 'day').format('YYYY-MM-DD')
    : dayjs(reservation.departure).format('YYYY-MM-DD');
    
  return (
    <Link href={`/rooms/${reservation.unitGroup.id}?from=${from}&to=${to}`} className="w-full">
      <Button variant='outline' className='h-[35px] text-sm px-5 gap-2 w-full justify-start'><FaCalendar />Book Again </Button>
    </Link> 
  )
}