'use client'
import { Button } from "@/app/_components/ui/button";
import { BsCheckCircleFill } from "react-icons/bs";
import { IoCard } from "react-icons/io5";
import { RiSofaFill } from "react-icons/ri";
import { FaCalendar } from "react-icons/fa";
import Link from "next/link";
import { Reservation } from "@/types/apaleo";
import dayjs from "dayjs";
export const CheckinButton = () => {
  return (
    <Button variant='outline' className='h-[35px] border-red text-red hover:bg-red hover:text-white text-sm px-5 gap-2 justify-start'><BsCheckCircleFill /> Complete Check-In </Button>
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
  return (
    <Button variant='outline' className='h-[35px] text-sm px-5 gap-2 justify-start'><FaCalendar />Extend Your Stay</Button>
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