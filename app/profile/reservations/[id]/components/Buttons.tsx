import { Button } from "@/app/_components/ui/button";
import { BsCheckCircleFill } from "react-icons/bs";
import { IoCard } from "react-icons/io5";
import { RiSofaFill } from "react-icons/ri";
import { FaCalendar } from "react-icons/fa";
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

export const BookAgainButton = () => {
  return (
    <Button variant='outline' className='h-[35px] text-sm px-5 gap-2 justify-start'><FaCalendar />Book Again </Button>
  )
}