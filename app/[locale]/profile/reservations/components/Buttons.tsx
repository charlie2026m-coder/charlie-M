import { Button } from "@/app/_components/ui/button";
import { IoAddCircleSharp } from "react-icons/io5";
import { AiFillInfoCircle } from "react-icons/ai";
import { FaCalendar } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { useState } from "react";
import { Link } from "@/navigation";
import CodeModal from "./CodeModal";
import dayjs from "dayjs";
import { Reservation } from "@/types/apaleo";
import { useTranslations } from "next-intl";

export const AddExtrasButton = () => {
  const t = useTranslations('profile')
  return (
    <Button variant='outline' className='h-[30px] text-sm'><IoAddCircleSharp className='size-4' /> {t('addExtras')} </Button>
  )
}
export const InfoButton = () => {
  const t = useTranslations('profile')
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
    <Button onClick={() => setShowInfo(true)} variant='outline' className='h-[30px] text-sm px-2 gap-1 '><AiFillInfoCircle className='size-4' /> {t('info')} </Button>
    <CodeModal open={showInfo} onOpenChange={setShowInfo} />
    </>
  )
}

export const DetailsButton = ({id}: {id: string}) => {
  const t = useTranslations('profile')
  return (
    <Button asChild className='h-[30px] text-[14px] lg:ml-auto'>
      <Link href={`/profile/reservations/${id}`}>{t('viewDetails')}</Link>
    </Button>
  )
}

export const BookAgainButton = ({ reservation }: { reservation: Reservation }) => {
  const t = useTranslations('profile')
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
    <Link href={`/rooms/${reservation.unitGroup.id}?from=${from}&to=${to}`} className="">
      <Button variant='outline' className='h-[30px] text-sm px-5 gap-2 w-full justify-start'><FaCalendar />{t('bookAgain')} </Button>
    </Link> 
  )
} 

export const InvoiceButton = () => {
  const t = useTranslations('profile')
  return (
    <Button variant='outline' className='h-[30px] text-sm'> <MdDownload className='size-4' /> {t('viewInvoice')} </Button>
  )
}

export const CheckinButton = () => {
  const t = useTranslations('profile')
  return (
    <Button variant='outline' className='h-[30px] border-red text-red hover:bg-red hover:text-white text-sm px-3'>{t('completeCheckIn')} </Button>
  )
}