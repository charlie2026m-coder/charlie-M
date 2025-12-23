'use client'
import { IoCard } from "react-icons/io5";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/app/_components/ui/ClientDialog";
import StatusBadge from "@/app/_components/ui/StatusBadge";
import { PiListFill } from "react-icons/pi";
import { RxCopy } from "react-icons/rx";
import { toast } from "sonner";
import { PiCalendarBlankFill } from "react-icons/pi";
import dayjs from "dayjs";
import { BsFillPersonFill } from "react-icons/bs";
import { FaSquarePlus } from "react-icons/fa6";
import { TiDelete } from "react-icons/ti";
import { RiMoneyEuroCircleFill } from "react-icons/ri";
import { Button } from "@/app/_components/ui/button";
import { bookingStatuses } from "@/types/types";
import { MdDownload } from "react-icons/md";

export const ReservationButton = ({ reservation }: { reservation: any }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reservation.code.toString());
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
    navigator.clipboard.writeText(reservation.code.toString());
    toast.success('Code copied to clipboard');
  }
  const from = dayjs(reservation.arrival).format('ddd DD MMM YYYY');
  const to = dayjs(reservation.departure).format('ddd DD MMM YYYY');
  const nights = dayjs(reservation.departure).diff(dayjs(reservation.arrival), 'day');
  const totalPrice = extras.reduce((acc: number, extra: any) => acc + extra.price * (extra.isDaily ? nights : 1), 0);


  return (
    <>
      <Dialog>
        <DialogTrigger className='flex gap-2 items-center rounded-full border border-black cursor-pointer hover:opacity-60 h-[35px] text-sm px-5 gap-2 justify-start w-full'>
          <IoCard />Reservation Details
        </DialogTrigger>
        <DialogContent className='w-[90%] max-w-[400px] px-4 rounded-3xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          <StatusBadge status={reservation.status} className="h-[35px] items-center justify-center" />

          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <PiListFill className='size-5' />Reservation :
            </div>
            <div className='flex items-center gap-2 text-lg cursor-pointer' onClick={handleCopy}>
              ID: {reservation.code} <RxCopy />
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <PiCalendarBlankFill className='size-5' />Dates :
            </div>
            <div className='flex text-lg '>
              {from} - {to}
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <BsFillPersonFill className='size-5' />Guests :
            </div>
            <div className='flex  text-lg '>
              {reservation.guests.join(', ')}
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <FaSquarePlus className='size-5' /><h3 className='text-lg font-semibold' >Extras :</h3>
            </div>
            <div className='flex flex-col gap-3'>
              {extras.map((extra: any) => (
                <ExtraItem key={extra.name} extra={extra} nights={nights} />
              ))}
            </div>
          </div>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <RiMoneyEuroCircleFill className='size-5' /><h3 className='text-lg font-semibold' >Total :</h3>
              <span className='font-semibold ml-auto'>€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
          {reservation.status === bookingStatuses.Confirmed && <Button className='w-full h-[45px] mt-3'>Cancel Booking</Button>}
          {reservation.status === bookingStatuses.CheckedOut && <Button variant="outline" className='w-full h-[45px] mt-3'><MdDownload /> Download Invoice</Button>}
        </DialogContent>
      </Dialog>
    </>
  )
}

const extras = [
  { name: 'Extra Bed', price: 8, isDaily: false },
  { name: 'Breakfast', price: 17, isDaily: true },
  { name: 'Parking', price: 25, isDaily: false },
  { name: 'Tax', price: 85, isDaily: false },
]

const ExtraItem = ({ extra, nights }: { extra: any, nights: number }) => {

  const price = extra.price * (extra.isDaily ? nights : 1);
  return (
    <div className='flex gap-2 text-lg justify-between w-full'>
      <div className='flex flex-col gap-2 inter text-sm text-dark'>
        <span>{extra.name}</span>
        <span>€{extra.price} {extra.isDaily && `x ${nights} ${nights === 1 ? 'night' : 'nights'}`} </span>
      </div>
      <div className='flex flex-col  font-semibold items-end'>
        <TiDelete className='size-6 cursor-pointer text-red-500' />
        <span>€{price.toFixed(2)}</span>
      </div>
    </div>
  )
}