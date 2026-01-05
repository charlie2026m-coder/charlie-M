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
import { RiMoneyEuroCircleFill } from "react-icons/ri";
import { Button } from "@/app/_components/ui/button";
import { bookingStatuses } from "@/types/types";
import { MdDownload } from "react-icons/md";
import { ServicesPaidDetails } from "@/types/apaleo";
import { useState } from "react";
import CancelBookingButton from "./CancelBookingButton";
import { ExtraRow } from "./ExtraRow";

export const ReservationButton = ({ reservation }: { reservation: any }) => {
  const { id, services, arrival, departure, adults, childrenAges, totalGrossAmount } = reservation;
  const [open, setOpen] = useState(false);
  const { firstName, lastName } = reservation.primaryGuest;
  let guests = `${firstName} ${lastName}`;
  const isConfirmed = reservation.status === bookingStatuses.Confirmed;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id.toString());
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  }
  const from = dayjs(arrival).format('ddd DD MMM YYYY');
  const to = dayjs(departure).format('ddd DD MMM YYYY');
  const nights = dayjs(departure).diff(dayjs(arrival), 'day');
  const roomPrice = totalGrossAmount?.amount || 0;
  
  const guestsCount = adults + (childrenAges?.length || 0);

  if(guestsCount > 1) {
    if(reservation.additionalGuests && reservation.additionalGuests.length > 0) {
      const additionalGuests = reservation.additionalGuests.map((guest: any) => guest.firstName + ' ' + guest.lastName).join(', ');
      guests = `${guests}, ${additionalGuests}`;
    } else {
      guests = `${guests} + ${guestsCount - 1}`;
    }
  }
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className='flex gap-2 items-center rounded-full border border-black cursor-pointer hover:opacity-60 h-[35px] text-sm px-5 gap-2 justify-start w-full'>
          <IoCard />Reservation Details
        </DialogTrigger>
        <DialogContent className='w-[90%] max-w-[400px] px-4 rounded-3xl max-h-[90vh] overflow-y-auto gap-0'>
          <DialogHeader>
            <DialogTitle className='mb-5'>Reservation Details</DialogTitle>
          </DialogHeader>
          <StatusBadge status={reservation.status} className="h-[35px] items-center justify-center mb-5" />
        
          <div className='flex flex-col gap-3 mb-7'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <PiListFill className='size-5' />Reservation :
            </div>
            <div className='flex items-center gap-2 text-lg cursor-pointer' onClick={handleCopy}>
              ID: {reservation.id} <RxCopy />
            </div>
          </div>

          <div className='flex flex-col gap-3 mb-7'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <PiCalendarBlankFill className='size-5' />Dates :
            </div>
            <div className='flex text-lg '>
              {from} - {to}
            </div>
          </div>

          <div className='flex flex-col gap-3 mb-7'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <BsFillPersonFill className='size-5' />Guests ({guestsCount}) :
            </div>
            <div className='flex  text-lg '>
              {guests} 
            </div>
          </div>

          {services?.length > 0 && 
            <div className='flex flex-col gap-3 mb-7'>
              <div className='flex items-center gap-2 text-lg font-semibold'>
                <FaSquarePlus className='size-5' /><h3 className='text-lg font-semibold' >Extras :</h3>
              </div>
              <div className='flex flex-col gap-3'>
                {services?.map((service: ServicesPaidDetails) => (
                  <ExtraRow 
                    key={service.service.id} 
                    service={service.service} 
                    nights={nights} 
                    price={service.totalAmount.grossAmount} 
                    isActive={isConfirmed}
                    reservationId={id}
                  />
                ))}
              </div>
            </div>
          }
          <div className='flex flex-col gap-3 mb-6'>
            <div className='flex items-center gap-2 text-lg font-semibold'>
              <RiMoneyEuroCircleFill className='size-5' /><h3 className='text-lg font-semibold' >Total :</h3>
              <span className='font-semibold ml-auto'>€{roomPrice}</span>
            </div>
          </div>
          {reservation.status === bookingStatuses.Confirmed && (
            <CancelBookingButton 
              reservationId={id} 
              onClose={() => setOpen(false)} 
            />
          )}
          {reservation.status === bookingStatuses.CheckedOut && <Button variant="outline" className='w-full h-[45px] mt-3'><MdDownload /> Download Invoice</Button>}
        </DialogContent>
      </Dialog>
    </>
  )
}
