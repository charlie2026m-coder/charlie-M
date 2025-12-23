import { Button } from "@/app/_components/ui/button";
import { IoAddCircleSharp } from "react-icons/io5";
import { AiFillInfoCircle } from "react-icons/ai";
import { FaCalendar } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { useState } from "react";
import Link from "next/link";
import CodeModal from "./CodeModal";

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

export const BookAgainButton = () => {
  return (
    <Button variant='outline' className='h-[30px] text-sm'><FaCalendar className='size-4' /> Book Again </Button>
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