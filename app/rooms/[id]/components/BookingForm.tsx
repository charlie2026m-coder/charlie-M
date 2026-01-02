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
import { BsFillPersonFill } from "react-icons/bs"
import { useStore } from "@/store/useStore"
import { RoomOffer } from "@/types/offers"
import dayjs from "dayjs"
import { UrlParams } from "@/types/apaleo"

const BookingForm = ({ id, room, params }: { id: string, room: RoomOffer , params: UrlParams }) => {
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const router = useRouter();
  const dateRangeStore = useStore(state => state.dateRange);
  const guestsStore = useStore(state => state.guests);
  const setValue = useStore(state => state.setValue);

  const [guests, setGuests] = useState({adults: parseInt(params?.adults || guestsStore?.adults.toString() || '1'), children: parseInt(params?.children || guestsStore?.children.toString() || '0')});
  const { priceText, nightsText } = getPriceData({ params, room })
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dateRangeStore.from || (params.from ? dayjs(params.from).toDate() : undefined),
    to: dateRangeStore.to || (params.to ? dayjs(params.to).toDate() : undefined),
  });
  const [currentPrice, setCurrentPrice] = useState(room.price)
  const [currentPriceText, setCurrentPriceText] = useState(priceText)
  const [currentNightsText, setCurrentNightsText] = useState(nightsText)

  useEffect(() => {
    if (params.from && params.to) {
      setDateRange({
        from: dayjs(params.from).toDate(),
        to: dayjs(params.to).toDate(),
      });
    }
  }, [params.from, params.to]);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const fromDate = getDate(dateRange.from);
    const toDate = getDate(dateRange.to);
    
    if (!fromDate || !toDate) return;
    
    const { priceText: newPriceText, nightsText: newNightsText } = getPriceData({ 
      params: {
        from: fromDate,
        to: toDate,
        adults: guests.adults.toString(),
        children: guests.children.toString(),
      }, 
      room 
    });

    setCurrentPrice(room.price);
    setCurrentPriceText(newPriceText);
    setCurrentNightsText(newNightsText);
  }, [dateRange?.from, dateRange?.to, guests, room]);


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
        <div className='text-brown flex items-center gap-1'>Per {currentNightsText} from </div>
        <div className='text-xl min-w-[80px] self-end text-center rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{currentPrice}</div>
      </div>
      <div className='text-blue flex items-center gap-1 my-4'><BsFillPersonFill className='size-4 text-blue' />{currentPriceText}</div>

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
            className="max-w-[350px]"
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={dateRange}
              onSelect={(date) => {
                setDateRange(date as DateRange);
                if (date?.from && date?.to) {
                  setValue(date as DateRange, 'dateRange');
                }
              }}
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