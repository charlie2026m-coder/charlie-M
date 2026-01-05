import { Button } from "@/app/_components/ui/button";
import { IoAddCircleSharp } from "react-icons/io5";
import { AiFillInfoCircle } from "react-icons/ai";
import { FaCalendar } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { useState } from "react";
import Link from "next/link";
import CodeModal from "./CodeModal";
import dayjs from "dayjs";
import { Reservation } from "@/types/apaleo";

export const AddExtrasButton = () => {
  return (
    <Button variant='outline' className='h-[30px] text-sm'><IoAddCircleSharp className='size-4' /> Add Extras </Button>
  )
}
export const InfoButton = () => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
    <Button onClick={() => setShowInfo(true)} className='h-[30px] text-sm text-white gap-1 '><AiFillInfoCircle className='size-4' /> Info </Button>
    <CodeModal open={showInfo} onOpenChange={setShowInfo} />
    </>
  )
}

export const DetailsButton = ({id}: {id: string}) => {
  return (
    <Button asChild className='h-[30px] text-[14px] lg:ml-auto'>
      <Link href={`/profile/reservations/${id}`}>View details</Link>
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
    <Link href={`/rooms/${reservation.unitGroup.id}?from=${from}&to=${to}`} className="">
      <Button variant='outline' className='h-[35px] text-sm px-5 gap-2 w-full justify-start'><FaCalendar />Book Again </Button>
    </Link> 
  )
} 

export const InvoiceButton = () => {
  return (
    <Button variant='outline' className='h-[30px] text-sm'> <MdDownload className='size-4' /> View Invoice </Button>
  )
}

export const CheckinButton = () => {
  return (
    <Button variant='outline' className='h-[30px] border-red text-red hover:bg-red hover:text-white text-sm px-3'>Complete Check-In </Button>
  )
}