"use client"
import { DateInput } from "@/app/_components/ui/DateInput"
import { Separator } from "@/app/_components/ui/separator"
import { Guests } from "@/app/_components/ui/guests"
import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import { Spinner } from "@/app/_components/ui/spinner"
import { useState, useEffect } from "react"
import { DateRange } from "react-day-picker"
import { useRouter } from "@/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { BsFillPersonFill } from "react-icons/bs"
import dayjs from "dayjs"

import { getDate, getPath, calculateNights, getType } from "@/lib/utils"
import { useStore } from "@/store/useStore"
import { UrlParams } from "@/types/apaleo"
import { getRoomPrice } from "@/app/actions/apaleo/rooms/getRoomPrice"

const BookingForm = ({
  id,
  params,
  isKidsBedAvailable = true,
  maxPersons,
}: {
  id: string
  params: UrlParams
  isKidsBedAvailable?: boolean
  maxPersons: number
}) => {
  const t = useTranslations('bookingForm')
  const tCommon = useTranslations()
  const router = useRouter()
  const dateRangeStore = useStore(state => state.dateRange)
  const guestsStore = useStore(state => state.guests)
  const setValue = useStore(state => state.setValue)

  const [openCheckIn, setOpenCheckIn] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const [guests, setGuests] = useState({
    adults: parseInt(params?.adults || guestsStore?.adults.toString() || '1'),
    children: parseInt(params?.children || guestsStore?.children.toString() || '0'),
  })
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dateRangeStore.from || (params.from ? dayjs(params.from).toDate() : undefined),
    to: dateRangeStore.to || (params.to ? dayjs(params.to).toDate() : undefined),
  })

  // Debounced dates for query — avoids request on every calendar click
  const fromStr = dateRange?.from ? getDate(dateRange.from) : undefined
  const toStr = dateRange?.to ? getDate(dateRange.to) : undefined
  const [debouncedFrom, setDebouncedFrom] = useState(fromStr)
  const [debouncedTo, setDebouncedTo] = useState(toStr)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFrom(fromStr)
      setDebouncedTo(toStr)
    }, 600)
    return () => clearTimeout(timer)
  }, [fromStr, toStr])

  const { data, isLoading: isPriceLoading } = useQuery({
    queryKey: ['room-price', id, debouncedFrom, debouncedTo, guests.adults],
    queryFn: () => getRoomPrice(id, debouncedFrom, debouncedTo, maxPersons),
    enabled: !!debouncedFrom && !!debouncedTo,
    staleTime: 1000 * 60 * 5,
  })

  // Derived values from query
  const nights = fromStr && toStr ? calculateNights(fromStr, toStr) : 0
  const type = nights > 0 ? getType(nights, true) : ''
  const room = data?.rooms.find(r => r.ratePlan.code === type) ?? data?.rooms[0] ?? null
  const babyBedAvailability = data?.babyBedAvailability
  const isUnavailable = !isPriceLoading && !!data && data.rooms.length === 0
  const hasEnoughCapacity = room ? guests.adults <= room.availableUnits * room.maxPersons : true

  // Price calculation
  const mp = room?.maxPersons || maxPersons
  const roomsForChildren = guests.children
  const adultsAssigned = Math.min(guests.adults, guests.children)
  let remainingAdults = guests.adults - adultsAssigned
  remainingAdults -= Math.min(remainingAdults, guests.children * (Math.min(mp, 2) - 1))
  const roomsNeeded = roomsForChildren + Math.ceil(remainingAdults / mp)
  const pricePerNight = guests.adults >= mp
    ? (room?.oneNightPriceForTwo || room?.oneNightPrice || 0)
    : (room?.oneNightPrice || 0)
  const currentPrice = room ? pricePerNight * nights * roomsNeeded : 0

  // Price description text
  const g = guests.adults === 1 ? t('guest') : t('guests')
  const n = nights === 1 ? t('night') : t('nights')
  const r = roomsNeeded === 1 ? t('room') : t('rooms')
  let priceText = `${guests.adults} ${g}`
  if (guests.children > 0) {
    const c = guests.children === 1 ? t('baby') : t('babies')
    priceText += ` + ${guests.children} ${c}`
  }
  priceText += `, ${nights} ${n}, ${roomsNeeded} ${r}`

  const handleBookNow = () => {
    if (!dateRange?.from || !dateRange?.to) {
      setDateError(true)
      return
    }
    setDateError(false)
    setIsNavigating(true)
    const queryString = getPath({
      from: getDate(dateRange.from),
      to: getDate(dateRange.to),
      adults: guests.adults.toString(),
      children: guests.children.toString(),
    })
    router.push(`/booking/${id}?${queryString}`)
  }

  const showPlaceholder = isPriceLoading || !room

  return (
    <div className='sticky shadow-xl top-10 flex flex-col bg-white border md:border-none rounded-[20px] px-5 pt-[25px] w-full pb-10'>
      <h3 className='font-semibold text-2xl text-center mb-3'>{t('title')}</h3>

      {/* Price row — always rendered, grey when loading/unavailable */}
      <div className={`flex justify-between mb-1 gap-2 ${isUnavailable || !hasEnoughCapacity ? 'opacity-0' : ''}`}>
        <div className='text-brown flex items-center gap-1'>{t('total')}</div>
        <div className={`text-xl min-w-[80px] self-end text-center rounded-full font-[700] px-2.5 py-2 ${showPlaceholder ? 'bg-gray-100 text-gray-300' : 'bg-green/15 text-green'}`}>
          {showPlaceholder ? '€ 00.00' : `€${currentPrice.toFixed(2)}`}
        </div>
      </div>

      {/* Info row — fixed height to prevent layout jump */}
      <div className='flex items-center gap-1 my-4 mb-10 h-6'>
        {isUnavailable ? (
          <span className='text-sm text-gray-400'>{t('unavailableForDates')}</span>
        ) : !hasEnoughCapacity ? (
          <span className='text-sm text-gray-400'>{tCommon('noCapacity')}</span>
        ) : (
          <span className={`text-mute flex items-center gap-1 text-sm ${showPlaceholder ? 'invisible' : ''}`}>
            <BsFillPersonFill className='size-4 text-mute' />{priceText}
          </span>
        )}
      </div>

      <div className='flex flex-col gap-5 w-full mb-5'>
        <div className='flex flex-col gap-1'>
          <DateInput
            value={dateRange || undefined}
            open={openCheckIn}
            onOpenChange={setOpenCheckIn}
            className="w-full md:max-w-[350px]"
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
                if (date?.from && !date?.to) {
                  const nextDay = new Date(date.from)
                  nextDay.setDate(nextDay.getDate() + 1)
                  const newRange = { from: date.from, to: nextDay }
                  setDateRange(newRange)
                  setValue(newRange, 'dateRange')
                  setDateError(false)
                } else if (date?.from && date?.to) {
                  const isSameDay = date.from.getTime() === date.to.getTime()
                  if (isSameDay) {
                    const nextDay = new Date(date.from)
                    nextDay.setDate(nextDay.getDate() + 1)
                    const newRange = { from: date.from, to: nextDay }
                    setDateRange(newRange)
                    setValue(newRange, 'dateRange')
                  } else {
                    setDateRange(date as DateRange)
                    setValue(date as DateRange, 'dateRange')
                  }
                  setDateError(false)
                } else {
                  setDateRange(date as DateRange)
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
          setValue={(value) => setGuests(value)}
          value={guests}
          maxBabyBeds={babyBedAvailability?.count}
          className="border-mute"
          maxPersons={room ? room.availableUnits * room.maxPersons : maxPersons}
          disableChildren={!isKidsBedAvailable}
        />
      </div>

      <Button
        className='w-full'
        onClick={handleBookNow}
        disabled={isNavigating || isUnavailable || !hasEnoughCapacity}
      >
        {isNavigating ? (
          <span className='flex items-center gap-2'>
            <Spinner className='size-4' />
            {tCommon('loading')}
          </span>
        ) : tCommon('book_now_btn')}
      </Button>
    </div>
  )
}

export default BookingForm
