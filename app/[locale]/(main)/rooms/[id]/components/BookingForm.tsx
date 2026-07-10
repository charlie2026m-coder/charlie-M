"use client"
import { DateInput } from "@/app/_components/ui/DateInput"
import { Separator } from "@/app/_components/ui/separator"
import { Guests } from "@/app/_components/ui/guests"
import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import { Spinner } from "@/app/_components/ui/spinner"
import { useState, useEffect, useMemo, useRef, useTransition } from "react"
import { DateRange } from "react-day-picker"
import { useRouter } from "@/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations, useLocale } from "next-intl"
import { BsFillPersonFill } from "react-icons/bs"
import { FiCalendar } from "react-icons/fi"
import { RiErrorWarningLine } from "react-icons/ri"
import dayjs from "dayjs"

import { getDate, getPath, getMinArrivalDate, calculateNights, calculateTotalTaxes } from "@/lib/utils"
import { resolveRatePlan } from "@/lib/Constants"
import TaxesInfo from "@/app/_components/ui/Taxes"
import { useStore } from "@/store/useStore"
import { UrlParams } from "@/types/apaleo"
import { getRoomPrice } from "@/app/actions/apaleo/rooms/getRoomPrice"
import { useMonthAvailability, toYmd } from "@/app/hooks/useMonthAvailability"
import { useBookableCheckouts, prefetchBookableCheckouts } from "@/app/hooks/useBookableCheckouts"
import {
  BOOKING_SECTION_ID,
  setScrollToBookingOnNextPage,
} from "@/app/hooks/useScrollToBookingSection"

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

  const minArrivalDate = useMemo(() => getMinArrivalDate(), []);

  const [openCheckIn, setOpenCheckIn] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [isNavigating, startNavigation] = useTransition()
  // Two-click range selection (parity with the search calendar): click 1 sets
  // the start, click 2 sets the end — no premature 1-night range on click 1.
  const [pickingCheckout, setPickingCheckout] = useState(false)
  const checkinRef = useRef<Date | undefined>(undefined)
  // Set true when a completed range auto-closes the panel. If late-arriving
  // availability then reveals a sold-out night (the drop effect below clears the
  // range), we re-open the panel so the guest sees the strikethrough + error
  // rather than the dates silently vanishing from a closed field.
  const justAutoClosedRef = useRef(false)

  // Mobile sticky footer CTA — shown once the in-card Book button scrolls out
  // of view (on mobile the booking card sits far below the room content).
  const mainBookRef = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)
  useEffect(() => {
    const el = mainBookRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: '0px 0px -80px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const [guests, setGuests] = useState({
    adults: parseInt(params?.adults || guestsStore?.adults.toString() || '1'),
    children: parseInt(params?.children || guestsStore?.children.toString() || '0'),
  })
  // URL params (a "Choose Room" card click or a shared link) carry the proposed
  // dates and are authoritative on entry — they win over the last-used store
  // range. Require BOTH from+to so a malformed one-sided URL can't splice a URL
  // arrival onto a stale store checkout. Normalize to the bare YYYY-MM-DD so a
  // time-bearing value can't render a different day on the server vs the client
  // (hydration mismatch).
  const hasUrlRange = Boolean(params.from && params.to)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    hasUrlRange
      ? { from: dayjs(params.from!.slice(0, 10)).toDate(), to: dayjs(params.to!.slice(0, 10)).toDate() }
      : { from: dateRangeStore.from, to: dateRangeStore.to }
  )

  // Real per-night availability for THIS room type (sold-out nights disabled).
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => dateRange?.from ?? new Date())
  const availFrom = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1))
  const availTo = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 2, 1))
  const { isSoldOut, rangeHasSoldOutNight, firstSoldOutNight } = useMonthAvailability(availFrom, availTo, id)

  const tDate = useTranslations('dateInput')
  const locale = useLocale()
  const dateFmt = locale === 'de' ? 'de-DE' : 'en-GB'
  // A range that crosses a sold-out night (or isn't a sellable stay) can't be
  // booked — flash a brief, self-dismissing message instead of completing it.
  const [soldOutMsg, setSoldOutMsg] = useState<string | null>(null)
  const soldOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashMsg = (text: string) => {
    setSoldOutMsg(text)
    if (soldOutTimer.current) clearTimeout(soldOutTimer.current)
    soldOutTimer.current = setTimeout(() => setSoldOutMsg(null), 4500)
  }
  const flashSoldOut = (date: Date) =>
    flashMsg(tDate('soldOutInRange', { date: new Intl.DateTimeFormat(dateFmt, { day: 'numeric', month: 'short' }).format(date) }))
  const flashMinStay = (nights: number) => flashMsg(tDate('minNights', { count: nights }))

  // Once a check-in is chosen, light up only the checkouts Apaleo can actually
  // sell for THIS room (min/max-stay + closed-to-departure) — probed with the
  // chosen adult count.
  const pickingArrival = pickingCheckout ? (dateRange?.from ?? null) : null
  const { isValidCheckout, ready: checkoutsReady, minNights, hasAnyCheckout } =
    useBookableCheckouts(pickingArrival, id, guests.adults)

  // Warm the bookable-checkout cache for the upcoming visible arrivals the moment
  // the calendar opens, so picking a check-in is instant.
  useEffect(() => {
    if (!openCheckIn) return
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const windowEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
    const start = monthStart < minArrivalDate ? minArrivalDate : monthStart
    const arrivals: Date[] = []
    for (let d = new Date(start); arrivals.length < 12 && d < windowEnd; d.setDate(d.getDate() + 1)) {
      if (!isSoldOut(d)) arrivals.push(new Date(d))
    }
    if (arrivals.length) prefetchBookableCheckouts(arrivals, id, guests.adults)
  }, [openCheckIn, visibleMonth, isSoldOut, guests.adults, id, minArrivalDate])

  // Swipe / drag (or the arrows) to page months, bounded at the earliest month.
  const swipeStartX = useRef<number | null>(null)
  const navigateMonth = (dir: 1 | -1) => {
    setVisibleMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + dir, 1)
      const minMonth = new Date(minArrivalDate.getFullYear(), minArrivalDate.getMonth(), 1)
      return next < minMonth ? prev : next
    })
  }

  // Dates precedence on this page: the URL range (above) is authoritative on
  // entry, and only store changes that happen AFTER mount (e.g. the on-page
  // calendar, or an external "apply dates") are adopted into local state. The
  // store's value AT mount must never override the URL-initialized range — else
  // the home page's seeded today→tomorrow range would replace the dates a card
  // linked to. We snapshot the store at mount and diff against it, rather than a
  // one-shot flag, so this stays correct under React's double-invoked dev
  // effects and any extra re-render. We also don't write the URL into the store,
  // so a range the guest typed on the home page survives a round-trip.
  const initialStoreRange = useRef({ from: dateRangeStore.from, to: dateRangeStore.to })
  useEffect(() => {
    const changedSinceMount =
      dateRangeStore.from?.getTime() !== initialStoreRange.current.from?.getTime() ||
      dateRangeStore.to?.getTime() !== initialStoreRange.current.to?.getTime()
    if (!changedSinceMount) return
    if (dateRangeStore.from && dateRangeStore.to) {
      setDateRange(prev => {
        if (prev?.from?.getTime() === dateRangeStore.from?.getTime() &&
            prev?.to?.getTime() === dateRangeStore.to?.getTime()) {
          return prev
        }
        return { from: dateRangeStore.from, to: dateRangeStore.to }
      })
    }
  }, [dateRangeStore.from, dateRangeStore.to])

  // Parity with the search calendar (review #5): a range seeded from the URL or
  // the persisted store may cross a night that is (now) sold out for THIS room.
  // The library's excludeDisabled only fires on interactive clicks, so drop
  // such a stale range once real availability arrives — it must never reach the
  // /booking step.
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return
    if (!rangeHasSoldOutNight(dateRange.from, dateRange.to)) return
    setDateRange({ from: undefined, to: undefined })
    setValue({ from: undefined, to: undefined }, 'dateRange')
    setDateError(true)
    // The range had auto-closed the panel but late-arriving availability now
    // shows a sold-out night — re-open so the guest sees the cleared field +
    // strikethrough in context. Guarded by the ref so an initial sold-out seed
    // (URL/store dates) doesn't pop the calendar open unprompted on load.
    if (justAutoClosedRef.current) {
      justAutoClosedRef.current = false
      setOpenCheckIn(true)
    }
  }, [dateRange?.from, dateRange?.to, rangeHasSoldOutNight, setValue])

  // Sync guests from store (when changed externally)
  useEffect(() => {
    setGuests(prev => {
      if (prev.adults === guestsStore.adults && prev.children === guestsStore.children) {
        return prev
      }
      return { adults: guestsStore.adults, children: guestsStore.children }
    })
  }, [guestsStore.adults, guestsStore.children])

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
  const room = data && nights > 0 ? resolveRatePlan(data.rooms, nights, false) : null
  const babyBedAvailability = data?.babyBedAvailability
  const isUnavailable = !isPriceLoading && !!data && data.rooms.length === 0
  const hasEnoughCapacity = room ? guests.adults <= room.availableUnits * room.maxPersons : true

  // Price calculation — mirrors calculateRoomPrice from BookingMenu
  const mp = room?.maxPersons || maxPersons
  const a = guests.adults
  const oneNight = room?.oneNightPrice || 0
  const oneNightTwo = room?.oneNightPriceForTwo || oneNight

  let roomsNeeded: number
  let totalNightlyRate: number

  if (a === 1) {
    roomsNeeded = 1
    totalNightlyRate = oneNight
  } else if (a % 2 === 0) {
    roomsNeeded = Math.ceil(a / mp)
    totalNightlyRate = roomsNeeded * oneNightTwo
  } else {
    // odd: floor(a/2) double rooms + 1 single room
    const doubles = Math.floor(a / mp)
    roomsNeeded = doubles + 1
    totalNightlyRate = doubles * oneNightTwo + oneNight
  }

  const currentPrice = room ? totalNightlyRate * nights : 0

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
    const queryString = getPath({
      from: getDate(dateRange.from),
      to: getDate(dateRange.to),
      adults: guests.adults.toString(),
      children: guests.children.toString(),
    })
    setScrollToBookingOnNextPage()
    startNavigation(() => {
      router.push(`/booking/${id}?${queryString}#${BOOKING_SECTION_ID}`)
    })
  }

  const showPlaceholder = isPriceLoading || !room

  const onStickyBook = () => {
    // Always take the guest UP to the booking card so they can review/select
    // dates + guests there — the real submit is the main Book button in the
    // card. Open the date picker when no dates are chosen yet.
    document.getElementById('room-booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (!fromStr || !toStr) setOpenCheckIn(true)
  }

  return (
    <>
    <div id='room-booking-card' className='scroll-mt-24 sticky shadow-xl top-10 flex flex-col bg-white border md:border-none rounded-[20px] px-5 pt-[25px] w-full pb-10'>
      <h3 className='font-semibold text-2xl text-center mb-3 flex items-center justify-center gap-2'>
        <FiCalendar className='size-5 text-blue shrink-0' />
        {t('title')}
      </h3>

      {/* Price row — always rendered, grey when loading/unavailable */}
      <div className={`flex justify-between mb-1 gap-2 ${isUnavailable || !hasEnoughCapacity ? 'opacity-0' : ''}`}>
        <div className='text-brown flex items-center gap-1'>{t('total')}</div>
        <div className={`text-xl min-w-[80px] self-end text-center rounded-full font-[700] px-2.5 py-2 ${showPlaceholder ? 'bg-gray-100 text-gray-300' : 'bg-green/15 text-green'}`}>
          {showPlaceholder ? '€ 00.00' : `€${currentPrice.toFixed(2)}`}
        </div>
      </div>
      {/* Nightly-rate breakdown — light line under the total. */}
      {!showPlaceholder && !isUnavailable && hasEnoughCapacity && nights > 0 && (
        <div className='text-sm text-dark tabular-nums'>
          €{totalNightlyRate.toFixed(2)} × {nights} {n}
        </div>
      )}

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
            onOpenChange={(open) => {
              setOpenCheckIn(open)
              if (open) { setPickingCheckout(false); checkinRef.current = undefined; justAutoClosedRef.current = false; setSoldOutMsg(null) }
            }}
            inputStyle={dateError ? "border-red" : "border-mute"}
            isError={dateError}
            frosted
            compact
            desktopAlign="center"
          >
            <div
              className='pb-1 touch-pan-y select-none'
              onPointerDown={(e) => { swipeStartX.current = e.clientX }}
              onPointerUp={(e) => {
                if (swipeStartX.current === null) return
                const dx = e.clientX - swipeStartX.current
                swipeStartX.current = null
                if (Math.abs(dx) < 60) return
                navigateMonth(dx < 0 ? 1 : -1)
              }}
            >
            <Calendar
              required={false}
              mode="range"
              captionLayout="label"
              numberOfMonths={1}
              selected={dateRange}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              showOutsideDays={false}
              fixedWeeks={false}
              modifiers={{
                soldOut: (date: Date) => {
                  // While picking the CHECKOUT, only strike days whose stay would
                  // CROSS a sold-out night — a valid checkout (incl. the sold-out
                  // day itself, you leave that morning) stays normal/selectable.
                  if (pickingCheckout && checkinRef.current && date.getTime() > checkinRef.current.getTime()) {
                    return rangeHasSoldOutNight(checkinRef.current, date)
                  }
                  return isSoldOut(date)
                },
              }}
              modifiersClassNames={{ soldOut: 'line-through' }}
              classNames={{ months: 'flex flex-col lg:flex-row gap-4' }}
              onSelect={(_date, triggerDate) => {
                if (!triggerDate) return
                // A sold-out night can't be a CHECK-IN (the prior checkout day is
                // kept clickable only so it renders selected — never let it start
                // a new stay).
                if (!pickingCheckout && isSoldOut(triggerDate)) return
                // Two-click selection, identical to the search calendar:
                // click 1 sets the check-in only (no premature 1-night range);
                // click 2 sets the check-out (or restarts if before the start).
                if (!pickingCheckout) {
                  checkinRef.current = triggerDate
                  const startOnly = { from: triggerDate, to: undefined }
                  setDateRange(startOnly)
                  setValue(startOnly, 'dateRange')
                  setPickingCheckout(true)
                } else {
                  const start = checkinRef.current!
                  if (triggerDate.getTime() > start.getTime()) {
                    // Диапазон через занятую ночь — называем блокирующую ночь и
                    // перезапускаем выбор с кликнутой даты.
                    const blocked = firstSoldOutNight(start, triggerDate)
                    if (blocked) {
                      flashSoldOut(blocked)
                      checkinRef.current = triggerDate
                      const startOnly = { from: triggerDate, to: undefined }
                      setDateRange(startOnly)
                      setValue(startOnly, 'dateRange')
                      return
                    }
                    // Apaleo не продаёт именно этот выезд (мин/макс срок или
                    // closed-to-departure) — обычно уже заблокирован, это страхует гонку.
                    if (checkoutsReady && !isValidCheckout(triggerDate)) {
                      if (minNights) flashMinStay(minNights)
                      else flashMsg(tDate('noCheckoutFromDate'))
                      checkinRef.current = triggerDate
                      const startOnly = { from: triggerDate, to: undefined }
                      setDateRange(startOnly)
                      setValue(startOnly, 'dateRange')
                      return
                    }
                    const newRange = { from: start, to: triggerDate }
                    setDateRange(newRange)
                    setValue(newRange, 'dateRange')
                    checkinRef.current = undefined
                    setPickingCheckout(false)
                    setSoldOutMsg(null)
                    // Range complete → auto-apply by closing the panel (the
                    // dates are already set; no navigation to booking here).
                    justAutoClosedRef.current = true
                    setOpenCheckIn(false)
                  } else if (triggerDate.getTime() === start.getTime()) {
                    // Same day clicked twice → a single night.
                    const nextDay = new Date(start)
                    nextDay.setDate(nextDay.getDate() + 1)
                    // ...unless 1 night isn't sellable here (min stay) — keep the
                    // check-in and show the minimum instead.
                    if (checkoutsReady && !isValidCheckout(nextDay)) {
                      if (minNights) flashMinStay(minNights)
                      else flashMsg(tDate('noCheckoutFromDate'))
                      return
                    }
                    const newRange = { from: start, to: nextDay }
                    setDateRange(newRange)
                    setValue(newRange, 'dateRange')
                    checkinRef.current = undefined
                    setPickingCheckout(false)
                    justAutoClosedRef.current = true
                    setOpenCheckIn(false)
                  } else {
                    // Clicked before the start → move the check-in there.
                    checkinRef.current = triggerDate
                    const startOnly = { from: triggerDate, to: undefined }
                    setDateRange(startOnly)
                    setValue(startOnly, 'dateRange')
                  }
                }
                setDateError(false)
              }}
              disabled={
                pickingCheckout && checkinRef.current
                  ? [
                      { before: minArrivalDate },
                      (date: Date) => {
                        const ci = checkinRef.current!
                        // Keep the already-chosen checkout looking selected.
                        if (dateRange?.to && date.getTime() === dateRange.to.getTime()) return false
                        // Up to the check-in: normal sold-out rule (re-picking arrival).
                        if (date.getTime() <= ci.getTime()) return isSoldOut(date)
                        // After the check-in: once offers loaded, enable ONLY bookable
                        // checkouts (min/max-stay + closed-to-departure). Until then,
                        // fall back to the instant physical rule.
                        return checkoutsReady ? !isValidCheckout(date) : rangeHasSoldOutNight(ci, date)
                      },
                    ]
                  : [{ before: minArrivalDate }, isSoldOut]
              }
            />
            </div>
            {soldOutMsg && (
              <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-1 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600'>
                <RiErrorWarningLine className='size-4 shrink-0' />
                <span>{soldOutMsg}</span>
              </div>
            )}
            {!soldOutMsg && pickingCheckout && pickingArrival && !checkoutsReady && (
              <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-1 flex items-center gap-2 rounded-lg bg-mute/5 px-3 py-2 text-[13px] text-mute/60'>
                <Spinner className='size-4 shrink-0' />
                <span>{tDate('checkingAvailability')}</span>
              </div>
            )}
            {!soldOutMsg && pickingCheckout && checkoutsReady && (
              !hasAnyCheckout ? (
                <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-1 flex items-center gap-2 rounded-lg bg-mute/5 px-3 py-2 text-[13px] text-mute/80'>
                  <RiErrorWarningLine className='size-4 shrink-0' />
                  <span>{tDate('noCheckoutFromDate')}</span>
                </div>
              ) : minNights && minNights > 1 ? (
                <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-1 flex items-center gap-2 rounded-lg bg-mute/5 px-3 py-2 text-[13px] text-mute/80'>
                  <RiErrorWarningLine className='size-4 shrink-0' />
                  <span>{tDate('minNights', { count: minNights })}</span>
                </div>
              ) : null
            )}
          </DateInput>
          {dateError && (
            <span className='text-red-500 text-sm pl-1'>{t('pleaseSelectDates')}</span>
          )}
        </div>

        <Separator orientation="horizontal" />

        <Guests
          setValue={(value) => { setGuests(value); setValue(value, 'guests') }}
          value={guests}
          maxBabyBeds={babyBedAvailability?.count}
          className="border-mute"
          maxPersons={room ? room.availableUnits * room.maxPersons : maxPersons}
          disableChildren={!isKidsBedAvailable}
        />
      </div>

      {!showPlaceholder && !isUnavailable && hasEnoughCapacity && room?.taxes && (
        <TaxesInfo
          taxes={calculateTotalTaxes([{ adults: guests.adults }], room.taxes, room.maxPersons || 2)}
          className='mb-4'
        />
      )}
      <div ref={mainBookRef}>
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
    </div>

    {/* Mobile sticky footer CTA — appears once the in-card Book button has
        scrolled out of view; brings the guest back up to the booking card. */}
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${showSticky ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
    >
      <div className='flex min-w-0 flex-col'>
        {isUnavailable || !hasEnoughCapacity || !fromStr || !toStr ? (
          <span className='text-sm font-medium text-mute'>{t('title')}</span>
        ) : showPlaceholder ? (
          <div className='flex flex-col gap-1.5' aria-hidden='true'>
            <div className='h-5 w-20 rounded bg-gray-200 animate-pulse' />
            <div className='h-3 w-28 rounded bg-gray-100 animate-pulse' />
          </div>
        ) : (
          <>
            <span className='text-lg font-[900] leading-none text-green tabular-nums'>€{currentPrice.toFixed(2)}</span>
            <span className='truncate text-[11px] text-dark'>{priceText}</span>
          </>
        )}
      </div>
      <Button className='ml-auto shrink-0 gap-2 px-6' onClick={onStickyBook}>
        <FiCalendar className='size-4' />
        {tCommon('book_now_btn')}
      </Button>
    </div>
    </>
  )
}

export default BookingForm
