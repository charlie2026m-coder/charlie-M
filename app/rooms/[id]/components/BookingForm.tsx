"use client"
import { DateInput } from "@/app/_components/ui/DateInput"
import { Separator } from "@/app/_components/ui/separator"
import { Guests } from "@/app/_components/ui/guests"
import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import { useEffect, useState } from "react"
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";

import { getDate, getPath, getPriceData } from "@/lib/utils";
import { Beds24RoomType, UrlParams } from "@/types/beds24";
import { BsFillPersonFill } from "react-icons/bs"
import { useBookingStore } from "@/store/bookingStore";

const BookingForm = ({ id, room, params }: { id: string, room: Beds24RoomType, params: UrlParams }) => {
  const router = useRouter();
  const { dateRange: dateRangeStore, guests: guestsStore } = useBookingStore();
  const { price, priceText, nightsText } = getPriceData({ params, room })

  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [guests, setGuests] = useState({adults: parseInt(params?.adults || guestsStore?.adults.toString() || '1'), children: parseInt(params?.children || guestsStore?.children.toString() || '0')});
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: params.from ? new Date(params.from) : dateRangeStore?.from,
    to: params.to ? new Date(params.to) : dateRangeStore?.to,
  });
  const [currentPrice, setCurrentPrice] = useState(price)
  const [currentPriceText, setCurrentPriceText] = useState(priceText)

  useEffect(() => {
    setDateRange({
      from: params.from ? new Date(params.from) : dateRangeStore?.from,
      to: params.to ? new Date(params.to) : dateRangeStore?.to,
    });
  }, [params.from, params.to, dateRangeStore]);


  useEffect(() => {
    const { price, priceText } = getPriceData({ params:{
      from: dateRange?.from ? getDate(dateRange.from) : undefined,
      to: dateRange?.to ? getDate(dateRange.to) : undefined,
      adults: guests.adults.toString(),
      children: guests.children.toString(),
    }, room })

    setCurrentPrice(price)
    setCurrentPriceText(priceText)
  }, [dateRange, guests])


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
      <h3 className='font-semibold text-2xl text-center mb-3'>BOOK</h3>
      <div className='flex justify-between mb-1 gap-2'>
        <div className='text-brown flex items-center gap-1'>Price per {nightsText}</div>
        <div className='text-xl min-w-[80px] self-end text-center rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{currentPrice}</div>
      </div>
      <div className='text-red flex items-center gap-1 my-4'><BsFillPersonFill className='size-4 text-red' />{currentPriceText}</div>

      <div className='flex flex-col gap-5 w-full mb-5'>
        <label className='w-full'>
          <div className='flex font-medium mb-2 gap-2 h-5 '>
            <div className=' pr-2 border-r-2 border-black pb-1'>Check In</div>
            <div className='pb-1'>Check out</div>
          </div>
          <DateInput 
            value={dateRange || undefined}
            open={openCheckIn}
            onOpenChange={setOpenCheckIn}
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
          <div className='font-medium mb-2'>Guests</div>
          <Guests setValue={setGuests} value={guests} />
        </label>
      </div>
      <Button className='w-full' onClick={handleBookNow}>Book Now</Button>
    </div>
  )
}

export default BookingForm