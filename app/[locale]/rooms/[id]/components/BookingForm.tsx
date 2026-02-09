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
import { useTranslations } from 'next-intl'

const BookingForm = ({ id, rooms, params, babyBedAvailability }: { 
  id: string, 
  rooms: RoomOffer[], 
  params: UrlParams,
  babyBedAvailability?: { isAvailable: boolean; count: number }
}) => {
  const t = useTranslations('bookingForm')
  const tCommon = useTranslations()
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
  

  const calculatePrice = (adultsCount: number, childrenCount: number, nightsCount: number) => {
    const roomsForChildren = childrenCount;
    
    const minAdultsForChildren = childrenCount;
    const adultsAssignedToChildren = Math.min(adultsCount, minAdultsForChildren);
    
    let remainingAdults = adultsCount - adultsAssignedToChildren;
    
    const maxAdultsPerChildRoom = 2;
    const additionalAdultsCapacity = childrenCount * (maxAdultsPerChildRoom - 1);
    const additionalAdultsAssigned = Math.min(remainingAdults, additionalAdultsCapacity);
    remainingAdults -= additionalAdultsAssigned;
    
    const roomsForRemainingAdults = Math.ceil(remainingAdults / 2);
    
    const roomsNeeded = roomsForChildren + roomsForRemainingAdults;
    
    const pricePerNight = adultsCount >= 2 
      ? (room.oneNightPriceForTwo || room.oneNightPrice || 0)
      : (room.oneNightPrice || 0);
    
    return pricePerNight * nightsCount * roomsNeeded;
  };

  const [currentPrice, setCurrentPrice] = useState(calculatePrice(guests.adults, guests.children, nights))
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
    setIsLoading(false);
  }, [params]);

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

    const nightsCount = calculateNights(fromDate, toDate);
    const totalPrice = calculatePrice(guests.adults, guests.children, nightsCount);

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
      router.push(`/rooms/${id}?${queryString}`);
      setDatesChanged(false);
    } else {
      router.push(`/booking/${id}?${queryString}`);
    }
  };
  return (
    <div className='sticky shadow-xl top-10 flex flex-col bg-white border md:border-none rounded-[20px] px-5 pt-[25px] w-full pb-10'>
      <h3 className='font-semibold text-2xl text-center mb-3'>{t('title')}</h3>
      <div className='flex justify-between mb-1 gap-2'>
        <div className='text-brown flex items-center gap-1'>{t('total')}</div>
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
              defaultMonth={dateRange?.from || new Date()}
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
            <span className='text-red-500 text-sm pl-1'>{t('pleaseSelectDates')}</span>
          )}
        </div>

        <Separator orientation="horizontal" />
        <Guests 
          setValue={(value) =>{
            setGuests(value);
            setDatesChanged(true);
          }} 
          value={guests}
          maxBabyBeds={babyBedAvailability?.count} 
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
            {tCommon('loading')}
          </span>
        ) : datesChanged ? t('search') : tCommon('book_now_btn')}
      </Button>
    </div>
  )
}

export default BookingForm