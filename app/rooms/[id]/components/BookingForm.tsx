"use client"
import { DateInput } from "@/app/_components/ui/DateInput"
import { Separator } from "@/app/_components/ui/separator"
import { Guests } from "@/app/_components/ui/guests"
import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import { useState } from "react"
import { DateRange } from "react-day-picker";
import { useRoomById } from "@/app/hooks/useRooms";


const BookingForm = ({ id }: { id: string }) => {
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [openCheckOut, setOpenCheckOut] = useState(false);


  const [checkInDate, setCheckInDate] = useState<DateRange | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<DateRange | undefined>(undefined);

  const { data: room, isLoading, isError } = useRoomById(id, `&from=${checkInDate?.from}&to=${checkOutDate?.to}`);

  
  const handleCheckInOpenChange = (open: boolean) => {
    setOpenCheckIn(open);
    if (open) setOpenCheckOut(false);
  };
  
  const handleCheckOutOpenChange = (open: boolean) => {
    setOpenCheckOut(open);
    if (open) setOpenCheckIn(false);
  };
  return (
    <div className='sticky top-10 flex flex-col bg-white rounded-[20px] px-5 pt-[25px] w-full pb-10'>
      <h3 className='font-semibold text-2xl text-center mb-3'>RESERVE</h3>
      <div className='flex items-center justify-between mb-4'>
        <div className='text-brown '>per night from</div>
        <div className='text-xl min-w-[80px] text-center rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{room?.minPrice?.toFixed(0) ?? 0}</div>
      </div>

      <div className='flex flex-col gap-5 w-full mb-5'>
        <label className='w-full'>
          <div className='font-medium mb-2'>Check In</div>
          <DateInput 
            value={checkInDate}
            open={openCheckIn}
            onOpenChange={handleCheckInOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={checkInDate}
              onSelect={setCheckInDate}
              disabled={{ before: new Date() }}
            />
          </DateInput>
        </label>
        <Separator orientation="horizontal" />
        <label className='w-full'>  
          <div className='font-medium mb-2'>Check Out</div>
          <DateInput 
            value={checkOutDate}
            open={openCheckOut}
            onOpenChange={handleCheckOutOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={checkOutDate}
              onSelect={setCheckOutDate}
              disabled={{ 
                before: checkInDate?.to || new Date() 
              }}
            />
          </DateInput>
        </label>
        <Separator orientation="horizontal" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests />
        </label>
      </div>
      <Button className='w-full'>Book Now</Button>
    </div>
  )
}

export default BookingForm