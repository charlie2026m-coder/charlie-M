'use client'
import { BsCalendar2Fill } from 'react-icons/bs'
import { FiEdit2 } from 'react-icons/fi'
import { RiErrorWarningLine } from 'react-icons/ri'
import dayjs from 'dayjs'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { Calendar } from '@/app/_components/ui/calendar'
import { Button } from '@/app/_components/ui/button'
import { Spinner } from '@/app/_components/ui/spinner'
import { DateRange } from 'react-day-picker'
import { useRouter, usePathname } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { getDate, getMinArrivalDate } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import { useRangePicker } from '@/app/hooks/useRangePicker'
import { useMonthAvailability, toYmd } from '@/app/hooks/useMonthAvailability'
import { useBookableCheckouts, prefetchBookableCheckouts } from '@/app/hooks/useBookableCheckouts'


const ChangeDate = ({ id, arrival, departure }: { id: string, arrival: string, departure: string }) => {
  const t = useTranslations('changeDate')
  const tCommon = useTranslations()
  const locale = useLocale()
  const dateFmt = locale === 'de' ? 'de-DE' : 'en-GB'
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const minArrivalDate = useMemo(() => getMinArrivalDate(), [])

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(arrival),
    to: new Date(departure)
  })

  // Brief, self-dismissing message when a pick is rejected (sold-out night /
  // min-stay / no sellable checkout) — same UX as the search calendar.
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showFlash = (text: string) => {
    setFlash(text)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 4500)
  }
  const flashSoldOut = (date: Date) =>
    showFlash(tCommon('dateInput.soldOutInRange', { date: new Intl.DateTimeFormat(dateFmt, { day: 'numeric', month: 'short' }).format(date) }))

  // Real per-night availability for THIS studio type — the visible month + the
  // next, refetched as the guest pages months. Mirrors BookingForm so the
  // in-booking date change can't dead-end on sold-out / too-short stays.
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date(arrival))
  const availFrom = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1))
  const availTo = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 2, 1))
  const { isSoldOut, rangeHasSoldOutNight, firstSoldOutNight } = useMonthAvailability(availFrom, availTo, id)

  // Once a check-in is chosen, light up ONLY the checkouts Apaleo can actually
  // sell from it for THIS studio (min/max-stay + closed-to-departure).
  const pickingArrival = dateRange?.from && !dateRange?.to ? dateRange.from : null
  const { isValidCheckout, ready: checkoutsReady, minNights, hasAnyCheckout } =
    useBookableCheckouts(pickingArrival, id, 1)

  // Warm the cache for upcoming arrivals when the popover opens so picking a
  // check-in is instant (no per-click round-trip).
  useEffect(() => {
    if (!open) return
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const windowEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 2, 1)
    const start = monthStart < minArrivalDate ? minArrivalDate : monthStart
    const arrivals: Date[] = []
    for (let d = new Date(start); arrivals.length < 12 && d < windowEnd; d.setDate(d.getDate() + 1)) {
      if (!isSoldOut(d)) arrivals.push(new Date(d))
    }
    if (arrivals.length) prefetchBookableCheckouts(arrivals, id, 1)
  }, [open, visibleMonth, minArrivalDate, isSoldOut, id])

  const { onSelect: onCalendarSelect, reset: resetRangePicker } = useRangePicker({
    onChange: setDateRange,
    sameDayAsOneNight: true,
    // Reject completing a range Apaleo can't sell for THIS studio. Once offers
    // have loaded we trust them (min/max-stay + closed-to-departure); until then
    // fall back to the instant physical rule (no sold-out night in the range).
    validate: (from, to) =>
      checkoutsReady ? isValidCheckout(to) : !rangeHasSoldOutNight(from, to),
    onInvalid: (from, to) => {
      if (checkoutsReady && !isValidCheckout(to)) {
        if (minNights) showFlash(tCommon('dateInput.minNights', { count: minNights }))
        else showFlash(tCommon('dateInput.noCheckoutFromDate'))
        return
      }
      const blocked = firstSoldOutNight(from, to)
      if (blocked) flashSoldOut(blocked)
    },
  })

  const handleApply = () => {
    if (!dateRange?.from || !dateRange?.to) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('from', getDate(dateRange.from)!)
    params.set('to', getDate(dateRange.to)!)

    setOpen(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleCancel = () => {
    setDateRange({
      from: new Date(arrival),
      to: new Date(departure)
    })
    resetRangePicker()
    setFlash(null)
    setOpen(false)
  }

  const checkIn = dateRange?.from && !dateRange?.to ? dateRange.from : undefined

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          resetRangePicker()
          setVisibleMonth(new Date(arrival))
          setFlash(null)
        }
      }}
    >
      <div className='flex px-2 gap-2 items-center font-bold'>
        <BsCalendar2Fill className='size-5 cursor-pointer self-center text-blue' />
        {dayjs(arrival).format('DD MMM YYYY')} - {dayjs(departure).format('DD MMM YYYY')}
        <PopoverTrigger asChild>
          <FiEdit2 className='size-5 cursor-pointer self-center ml-auto text-blue' />
        </PopoverTrigger>
      </div>

      <PopoverContent
        className="overflow-hidden rounded-[20px] bg-white p-4 flex flex-col w-[350px]"
        align="end"
        side="bottom"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          required={false}
          mode="range"
          captionLayout="label"
          selected={dateRange}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          excludeDisabled
          modifiers={{
            // Strike sold-out nights (arrival view), and on the checkout view
            // only strike days that would CROSS a sold-out night.
            soldOut: checkIn
              ? (day: Date) => day.getTime() > checkIn.getTime() && rangeHasSoldOutNight(checkIn, day)
              : isSoldOut,
          }}
          modifiersClassNames={{ soldOut: 'line-through' }}
          onSelect={onCalendarSelect}
          disabled={checkIn
            ? [
                { before: minArrivalDate },
                (day: Date) => {
                  if (day.getTime() <= checkIn.getTime()) return isSoldOut(day)
                  return checkoutsReady ? !isValidCheckout(day) : rangeHasSoldOutNight(checkIn, day)
                },
              ]
            : [{ before: minArrivalDate }, isSoldOut]
          }
        />

        {flash && (
          <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600'>
            <RiErrorWarningLine className='size-4 shrink-0' />
            <span>{flash}</span>
          </div>
        )}
        {!flash && pickingArrival && !checkoutsReady && (
          <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-2 flex items-center gap-2 rounded-lg bg-mute/5 px-3 py-2 text-[13px] text-mute/60'>
            <Spinner className='size-4 shrink-0' />
            <span>{tCommon('dateInput.checkingAvailability')}</span>
          </div>
        )}
        {!flash && pickingArrival && checkoutsReady && (
          !hasAnyCheckout ? (
            <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-2 flex items-center gap-2 rounded-lg bg-mute/5 px-3 py-2 text-[13px] text-mute/80'>
              <RiErrorWarningLine className='size-4 shrink-0' />
              <span>{tCommon('dateInput.noCheckoutFromDate')}</span>
            </div>
          ) : minNights && minNights > 1 ? (
            <div role="status" className='animate-in fade-in slide-in-from-top-1 duration-300 mt-2 flex items-center gap-2 rounded-lg bg-mute/5 px-3 py-2 text-[13px] text-mute/80'>
              <RiErrorWarningLine className='size-4 shrink-0' />
              <span>{tCommon('dateInput.minNights', { count: minNights })}</span>
            </div>
          ) : null
        )}

        <div className='grid grid-cols-2 gap-2 mt-4'>
          <Button onClick={handleCancel} variant='outline'>{t('cancel')}</Button>
          <Button onClick={handleApply} disabled={!dateRange?.from || !dateRange?.to}>{t('apply')}</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ChangeDate
