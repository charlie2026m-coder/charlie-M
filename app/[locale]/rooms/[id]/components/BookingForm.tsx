"use client"
import { DateInput } from "@/app/_components/ui/DateInput"
import { Separator } from "@/app/_components/ui/separator"
import { Guests } from "@/app/_components/ui/guests"
import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import { Spinner } from "@/app/_components/ui/spinner"
import { useEffect, useState } from "react"
import { DateRange } from "react-day-picker";
import { useRouter } from "@/navigation";

import { getDate, getPath, getPriceData } from "@/lib/utils";
import { BsFillPersonFill } from "react-icons/bs"
import { useStore } from "@/store/useStore"
import { RoomOffer } from "@/types/offers"
import dayjs from "dayjs"
import { UrlParams } from "@/types/apaleo"
import { calculateNights } from "@/lib/utils"
import { RATE_PLANS } from "@/lib/Constants"

const BookingForm = ({ id, rooms, params }: { id: string, rooms: RoomOffer[] , params: UrlParams }) => {
  const nights = calculateNights(params.from as string, params.to as string);
  const type = nights >= 7 ? RATE_PLANS.LONG_STAY : RATE_PLANS.STANDARD;
  const room = rooms.find(room => room.ratePlan.code.includes(type)) || rooms[0];
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const router = useRouter();
  const dateRangeStore = useStore(state => state.dateRange);
  const guestsStore = useStore(state => state.guests);
  const setValue = useStore(state => state.setValue);

  const [guests, setGuests] = useState({adults: parseInt(params?.adults || guestsStore?.adults.toString() || '1'), children: parseInt(params?.children || guestsStore?.children.toString() || '0')});
  const { priceText } = getPriceData({ params, room: room })
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dateRangeStore.from || (params.from ? dayjs(params.from).toDate() : undefined),
    to: dateRangeStore.to || (params.to ? dayjs(params.to).toDate() : undefined),
  });
  
  // Calculate initial price based on guest count
  const calculatePrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / room.maxPersons);
    
    let roomPrice = 0;
    let taxAmount = 0;
    
    if (adultsCount === 1) {
      roomPrice = room.price || room.totalGrossAmount.amount || 0;
      taxAmount = room.cityTax || 0;
    } else if (adultsCount % 2 === 0) {
      roomPrice = roomsNeeded * (room.priceForTwo || room.price || room.totalGrossAmount.amount || 0);
      taxAmount = roomsNeeded * (room.cityTaxForTwo || room.cityTax || 0);
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      roomPrice = (doubleRooms * (room.priceForTwo || room.price || room.totalGrossAmount.amount || 0)) + (room.price || room.totalGrossAmount.amount || 0);
      taxAmount = (doubleRooms * (room.cityTaxForTwo || room.cityTax || 0)) + (room.cityTax || 0);
    }
    
    return roomPrice + taxAmount;
  };

  const [currentPrice, setCurrentPrice] = useState(calculatePrice(guests.adults))
  const [currentPriceText, setCurrentPriceText] = useState(priceText)
  const [dateError, setDateError] = useState(false)
  const [datesChanged, setDatesChanged] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (params.from && params.to) {
      setDateRange({
        from: dayjs(params.from).toDate(),
        to: dayjs(params.to).toDate(),
      });
    }
    // Reset loading state when component mounts or params change
    setIsLoading(false);
  }, [params.from, params.to]);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const fromDate = getDate(dateRange.from);
    const toDate = getDate(dateRange.to);
    
    if (!fromDate || !toDate) return;
    
    const { priceText: newPriceText } = getPriceData({ 
      params: {
        from: fromDate,
        to: toDate,
        adults: guests.adults.toString(),
        children: guests.children.toString(),
      }, 
      room 
    });

    // Calculate price using the calculatePrice function (includes tax)
    const totalPrice = calculatePrice(guests.adults);

    setCurrentPrice(totalPrice);
    setCurrentPriceText(newPriceText);
  }, [dateRange?.from, dateRange?.to, guests, room]);


  const handleBookNow = () => {
    if (!dateRange?.from || !dateRange?.to) {
      setDateError(true);
      return;
    }
    setDateError(false);
    setIsLoading(true);
    
    const queryString = getPath({ 
      from: getDate(dateRange?.from), 
      to: getDate(dateRange?.to), 
      adults: guests.adults.toString(), 
      children: guests.children.toString() 
    });
    
    if (datesChanged) {
      // Reload current page with new query params to fetch updated data
      router.push(`/rooms/${id}?${queryString}`);
      setDatesChanged(false);
    } else {
      // Proceed to booking
      router.push(`/booking/${id}?${queryString}`);
    }
  };
  return (
    <div className='sticky shadow-xl top-10 flex flex-col bg-white border md:border-none rounded-[20px] px-5 pt-[25px] w-full pb-10'>
      <h3 className='font-semibold text-2xl text-center mb-3'>BOOK</h3>
      <div className='flex justify-between mb-1 gap-2'>
        <div className='text-brown flex items-center gap-1'>Total</div>
        <div className='text-xl min-w-[80px] self-end text-center rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{currentPrice.toFixed(2)}</div>
      </div>
      <div className='text-mute flex items-center gap-1 my-4 mb-10'><BsFillPersonFill className='size-4 text-mute' />{currentPriceText}</div>

      <div className='flex flex-col gap-5 w-full mb-5'>
        <div className='flex flex-col gap-1'>
          <DateInput 
            value={dateRange || undefined}
            open={openCheckIn}
            onOpenChange={setOpenCheckIn}
            className="w-full md:max-w-[350px] "
            inputStyle={dateError ? "border-red" : "border-mute"}
            isError={dateError}
          >
            <Calendar 
              required={false}
              mode="range"  
              captionLayout="label"
              selected={dateRange}
              onSelect={(date) => {
                setDatesChanged(true);
                if (date?.from && !date?.to) {
                  const nextDay = new Date(date.from);
                  nextDay.setDate(nextDay.getDate() + 1);
                  const newRange = { from: date.from, to: nextDay };
                  setDateRange(newRange);
                  setValue(newRange, 'dateRange');
                  setDateError(false);
                } else if (date?.from && date?.to) {
                  // Check if same day selected
                  if (date.from.getTime() === date.to.getTime()) {
                    const nextDay = new Date(date.from);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const newRange = { from: date.from, to: nextDay };
                    setDateRange(newRange);
                    setValue(newRange, 'dateRange');
                  } else {
                    setDateRange(date as DateRange);
                    setValue(date as DateRange, 'dateRange');
                  }
                  setDateError(false);
                } else {
                  setDateRange(date as DateRange);
                }
              }}
              disabled={{ before: new Date() }}
            />
          </DateInput>
          {dateError && (
            <span className='text-red-500 text-sm pl-1'>Please select  dates</span>
          )}
        </div>

        <Separator orientation="horizontal" />
        <Guests 
          setValue={setGuests} 
          value={guests} 
          className="border-mute"
          maxPersons={room.availableUnits * room.maxPersons}
        />
      </div>
      <Button 
        className='w-full' 
        onClick={handleBookNow}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className='flex items-center gap-2'>
            <Spinner className='size-4' />
            Loading...
          </span>
        ) : datesChanged ? 'Search' : 'Book Now'}
      </Button>
    </div>
  )
}

export default BookingForm