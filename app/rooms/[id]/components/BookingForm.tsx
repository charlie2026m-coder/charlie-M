"use client"
import { DateInput } from "@/app/_components/ui/DateInput"
import { Separator } from "@/app/_components/ui/separator"
import { Guests } from "@/app/_components/ui/guests"
import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import { useState } from "react"
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";

import { getDate, getPath } from "@/lib/utils";
const BookingForm = ({ id, room, params }: { id: string, room: any, params: { from?: string, to?: string, adults?: string, children?: string } }) => {
  const router = useRouter();
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [openCheckOut, setOpenCheckOut] = useState(false);
  const [guests, setGuests] = useState({adults: parseInt(params?.adults || '1'), children: parseInt(params?.children || '0')});

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
  });

  const handleCheckInOpenChange = (open: boolean) => {
    setOpenCheckIn(open);
    if (open) setOpenCheckOut(false);
  };
  
  const handleCheckOutOpenChange = (open: boolean) => {
    setOpenCheckOut(open);
    if (open) setOpenCheckIn(false);  
  };

  const handleBookNow = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    const queryString = getPath({ 
      from: getDate(dateRange?.from), 
      to: getDate(dateRange?.to), 
      adults: guests.adults.toString(), 
      children: guests.children.toString() 
    });
    router.push(`/booking/${id}?${queryString}`);
  };
  return (
    <div className='sticky top-10 flex flex-col bg-white rounded-[20px] px-5 pt-[25px] w-full pb-10'>
      <h3 className='font-semibold text-2xl text-center mb-3'>RESERVE</h3>
      <div className='flex items-center justify-between mb-4'>
        <div className='text-brown '>per night from</div>
        <div className='text-xl min-w-[80px] text-center rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{room?.minPrice.toFixed(0) ?? 0}</div>
      </div>

      <div className='flex flex-col gap-5 w-full mb-5'>
        <label className='w-full'>
          <div className='font-medium mb-2'>Check In</div>
          <DateInput 
            value={dateRange?.from}
            open={openCheckIn}
            onOpenChange={handleCheckInOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={dateRange}
              onSelect={(date) => setDateRange(date as DateRange)}
              disabled={{ before: new Date() }}
            />
          </DateInput>
        </label>
        <Separator orientation="horizontal" />
        <label className='w-full'>  
          <div className='font-medium mb-2'>Check Out</div>
          <DateInput 
            value={dateRange?.to}
            open={openCheckOut}
            onOpenChange={handleCheckOutOpenChange}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={dateRange}
              onSelect={(date) => setDateRange(date as DateRange)}
              disabled={{ 
                before: dateRange?.from || new Date() 
              }}
            />
          </DateInput>
        </label>
        <Separator orientation="horizontal" />
        <label className='w-full'>
          <div className='font-medium mb-2'>Guests</div>
          <Guests setValue={setGuests} value={guests} />
        </label>
      </div>
      <Button className='w-full' onClick={handleBookNow}>Book Now</Button>
    </div>
  )
}

export default BookingForm