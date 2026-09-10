'use client'
import { useMemo, useRef, useState } from 'react'
import { Calendar } from '@/app/_components/ui/calendar'
import { DateRange } from 'react-day-picker'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { RiErrorWarningLine } from 'react-icons/ri'
import { Button } from '@/app/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
} from '@/app/_components/ui/ClientDialog'
import { useAddExtrasStore } from '@/store/useAddExtras'
import { FLEX_WEB_CODES } from '@/lib/Constants'
import { useRangePicker } from '@/app/hooks/useRangePicker'
import { useMonthAvailability, toYmd } from '@/app/hooks/useMonthAvailability'
import { useBookableCheckouts } from '@/app/hooks/useBookableCheckouts'
import { useUnitAvailability } from '@/app/hooks/useUnitAvailability'
import {
  useRebookQuote,
  useApplyRebook,
  RebookError,
  type RebookQuote,
  type RebookRefusal,
} from '@/app/hooks/useRebook'

/**
 * Move a booking to different dates.
 *
 * Only rendered for a reservation the server would actually accept (the page
 * checks status, channel, FLEX and the cancellation deadline before mounting
 * this) — otherwise the guest gets a control that can only ever say no.
 *
 * The panel never computes money. It asks the quote endpoint, shows what the
 * server said, and sends back nothing but two dates.
 *
 * The calendar greys out by the guest's OWN studio, not by their category.
 * That is what the quote enforces — a date change is only sold when the guest
 * keeps their exact room — so anything looser paints dates the Check would then
 * refuse with 'unit-unavailable'. Measured live, category greying offered 47
 * three-night windows on a booking where only 37 were actually movable.
 * Category availability is the fallback for a reservation Apaleo has not
 * assigned a studio to yet, which is exactly when the quote skips its own-unit
 * check too.
 *
 * On top of that, once a check-in is picked only the checkouts Apaleo can
 * really sell from it stay live (min/max-stay), and the click behaviour comes
 * from the shared range picker rather than raw react-day-picker.
 */

interface ChangeDatesProps {
  reservationId: string
  arrival: string // YYYY-MM-DD
  departure: string // YYYY-MM-DD
  /** Studio category — availability and min-stay are per category. */
  unitGroupId?: string
  adults?: number
}

/** Matches MAX_MOVE_AHEAD_DAYS on the server, so the calendar cannot offer a
 *  date the quote would refuse as 'too-far-ahead'. */
const MAX_MOVE_AHEAD_DAYS = 365

const money = (cents: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(cents / 100)

const ChangeDates = ({
  reservationId,
  arrival,
  departure,
  unitGroupId,
  adults = 1,
}: ChangeDatesProps) => {
  const t = useTranslations('reservations')
  const tCommon = useTranslations()
  const locale = useLocale()
  const dateFmt = locale === 'de' ? 'de-DE' : 'en-GB'
  const router = useRouter()
  const { openChangeDates, setOpenChangeDates } = useAddExtrasStore()

  const [range, setRange] = useState<DateRange | undefined>()
  const [quote, setQuote] = useState<RebookQuote | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { mutate: fetchQuote, isPending: isQuoting } = useRebookQuote(reservationId)
  const { mutate: applyMove, isPending: isApplying } = useApplyRebook(reservationId)

  // Tomorrow at the earliest: the server refuses a move onto today, whose night
  // audit is only hours away.
  const earliest = useMemo(() => dayjs().add(1, 'day').startOf('day').toDate(), [])
  const latest = useMemo(
    () => dayjs().add(MAX_MOVE_AHEAD_DAYS, 'day').startOf('day').toDate(),
    [],
  )

  // Brief, self-dismissing message when a pick is rejected — same UX as the
  // search and in-booking calendars.
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showFlash = (text: string) => {
    setFlash(text)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 4500)
  }

  // Real per-night availability for THIS studio type across the two visible
  // months plus one ahead, refetched as the guest pages through.
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => dayjs(arrival).toDate())
  const availFrom = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1))
  const availTo = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 3, 1))
  const { isSoldOut, rangeHasSoldOutNight, firstSoldOutNight } = useMonthAvailability(
    availFrom,
    availTo,
    unitGroupId,
  )

  // The guest's own studio over the same window — the signal that matches the
  // quote. Category availability cannot stand in for it even as an extra
  // filter: it counts the guest's OWN booking as consuming a studio, so a guest
  // shortening their stay would find their current dates greyed out.
  const unitAvail = useUnitAvailability(reservationId, availFrom, availTo, openChangeDates)
  const byUnit = unitAvail.hasUnit && unitAvail.ready

  // A night is out if EITHER signal says so, because each one catches
  // something the other cannot:
  //   * the unit query sees who is booked into this exact studio, which is
  //     what the quote's own-unit rule tests;
  //   * category availability catches nights Apaleo will not sell at all —
  //     including bookings it has not yet assigned a studio to, which consume
  //     category inventory and are invisible to a unitIds filter. Measured on
  //     a live booking: its own studio looked free on three nights its
  //     category was at zero, and the offers call returns nothing for those,
  //     so the quote would have refused with 'no-offer'.
  // Taking the union means every greyed date is one the server would refuse,
  // and every open date is one it can actually price.
  const dayBlocked = (day: Date) =>
    isSoldOut(day) || (byUnit && unitAvail.isUnitBusy(day))
  const rangeBlocked = (a: Date, b: Date) =>
    rangeHasSoldOutNight(a, b) || (byUnit && unitAvail.rangeHasBusyNight(a, b))
  const firstBlocked = (a: Date, b: Date) =>
    firstSoldOutNight(a, b) ?? (byUnit ? unitAvail.firstBusyNight(a, b) : null)

  // Once a check-in is chosen, light up ONLY the checkouts Apaleo can actually
  // sell from it (min/max-stay + closed-to-departure).
  const checkIn = range?.from && !range?.to ? range.from : null
  // Restricted to the refundable web rates, because those are the only ones a
  // date change can be moved onto. Without the restriction a date offered only
  // under FLEX_EXTN / NR_EXTN looked bookable and the Check then refused it as
  // 'rate-plan-mismatch' — measured on 1-3 Oct, where MOT-SKB had the two
  // extension rates and no FLEX_WEB at all.
  const { isValidCheckout, ready: checkoutsReady, minNights } = useBookableCheckouts(
    checkIn,
    unitGroupId,
    adults,
    FLEX_WEB_CODES,
  )

  // Any change to the selection invalidates the priced answer on screen.
  const onRangeChange = (next: DateRange | undefined) => {
    setRange(next)
    setQuote(null)
  }

  const { onSelect: onCalendarSelect, reset: resetRangePicker } = useRangePicker({
    onChange: onRangeChange,
    sameDayAsOneNight: true,
    // The studio being taken is decisive and always applies; min-stay only
    // once the offers have loaded.
    validate: (from, to) => {
      if (rangeBlocked(from, to)) return false
      return checkoutsReady ? isValidCheckout(to) : true
    },
    onInvalid: (from, to) => {
      const blocked = firstBlocked(from, to)
      if (!blocked && checkoutsReady && !isValidCheckout(to)) {
        if (minNights) showFlash(tCommon('dateInput.minNights', { count: minNights }))
        else showFlash(tCommon('dateInput.noCheckoutFromDate'))
        return
      }
      if (blocked) {
        showFlash(
          tCommon('dateInput.soldOutInRange', {
            date: new Intl.DateTimeFormat(dateFmt, { day: 'numeric', month: 'short' }).format(
              blocked,
            ),
          }),
        )
      }
    },
    onErrorClear: () => setQuote(null),
  })

  const nights =
    range?.from && range?.to ? dayjs(range.to).diff(dayjs(range.from), 'day') : 0
  const hasRange = Boolean(range?.from && range?.to && nights > 0)

  const reset = () => {
    setRange(undefined)
    setQuote(null)
    setFlash(null)
    resetRangePicker()
  }

  const refusalText = (reason?: RebookRefusal) => {
    const known: RebookRefusal[] = [
      'not-found',
      'not-own-channel',
      'not-confirmed',
      'not-refundable',
      'deadline-passed',
      'already-rebooked',
      'dates-invalid',
      'too-far-ahead',
      'no-offer',
      'rate-plan-mismatch',
      'unit-unavailable',
      'top-up-required',
      'price-unreadable',
      'needs-manual',
    ]
    return reason && known.includes(reason)
      ? t(`changeDates.refusal.${reason}`)
      : t('changeDates.refusal.generic')
  }

  const onCheck = () => {
    if (!range?.from || !range?.to) return
    fetchQuote(
      { from: range.from, to: range.to },
      {
        onSuccess: (data) => setQuote(data),
        onError: (err) =>
          toast.error(
            err instanceof RebookError ? refusalText(err.reason) : t('changeDates.refusal.generic'),
          ),
      },
    )
  }

  const onConfirm = () => {
    if (!range?.from || !range?.to) return
    applyMove(
      { from: range.from, to: range.to },
      {
        onSuccess: (res) => {
          setConfirmOpen(false)
          setOpenChangeDates(false)
          reset()
          toast.success(
            res.manualReview ? t('changeDates.movedManualReview') : t('changeDates.moved'),
          )
          // The page is a server component — pull the new dates from Apaleo.
          router.refresh()
        },
        onError: (err) => {
          setConfirmOpen(false)
          toast.error(
            err instanceof RebookError ? refusalText(err.reason) : t('changeDates.refusal.generic'),
          )
        },
      },
    )
  }

  if (!openChangeDates) return null

  // A move that costs MORE is applied by the Adyen webhook after the guest
  // authorises the difference, so it takes a different button and a different
  // page — nothing can be settled inside this panel.
  const delta = quote?.deltaCents ?? 0
  const isTopUp = Boolean(quote?.eligible) && delta > 0
  const topUpCents = delta > 0 ? delta : 0
  const refundCents = delta < 0 ? -delta : 0
  const currency = quote?.currency ?? 'EUR'
  const localePrefix = locale === 'de' ? '/de' : ''

  return (
    <div className='bg-white overflow-hidden mb-6'>
      <div className='flex items-center justify-between pt-5 pb-4'>
        <h2 className='text-[20px] font-black text-green'>{t('changeDates.title')}:</h2>
        <button
          className='p-1 text-dark hover:text-dark/60 transition-colors cursor-pointer'
          onClick={() => setOpenChangeDates(false)}
          aria-label={t('changeDates.close')}
        >
          <X className='size-6' strokeWidth={3} />
        </button>
      </div>

      <div className='px-6 pb-4'>
        <p className='mx-auto mb-3 max-w-[640px] text-center text-[13px] leading-snug text-muted'>
          {t('changeDates.currentStay', {
            from: dayjs(arrival).format('DD.MM.YYYY'),
            to: dayjs(departure).format('DD.MM.YYYY'),
          })}
        </p>
        <Calendar
          required={false}
          mode='range'
          numberOfMonths={2}
          captionLayout='label'
          selected={range}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          excludeDisabled
          onSelect={onCalendarSelect}
          modifiers={{
            // Strike taken nights while picking a check-in; once one is chosen,
            // strike only the days that would CROSS a taken night.
            soldOut: checkIn
              ? (day: Date) => day.getTime() > checkIn.getTime() && rangeBlocked(checkIn, day)
              : dayBlocked,
          }}
          modifiersClassNames={{ soldOut: 'line-through' }}
          disabled={
            checkIn
              ? [
                  { before: earliest },
                  { after: latest },
                  (day: Date) => {
                    if (day.getTime() <= checkIn.getTime()) return dayBlocked(day)
                    if (rangeBlocked(checkIn, day)) return true
                    return checkoutsReady ? !isValidCheckout(day) : false
                  },
                ]
              : [{ before: earliest }, { after: latest }, dayBlocked]
          }
          className='mx-auto'
        />

        {checkIn && !checkoutsReady && (
          <p className='mt-2 text-center text-[13px] text-muted'>
            {tCommon('dateInput.checkingAvailability')}
          </p>
        )}

        {flash && (
          <div
            role='status'
            className='animate-in fade-in slide-in-from-top-1 duration-300 mx-auto mt-2 flex max-w-[640px] items-center gap-2 rounded-lg bg-red/5 px-3 py-2 text-[13px] text-red'
          >
            <RiErrorWarningLine className='size-4 shrink-0' />
            <span>{flash}</span>
          </div>
        )}

        {/* Says the rule up front rather than letting them find it in a
            refusal: one move, same studio type, and only while the booking is
            still freely cancellable. */}
        <p className='mx-auto mt-3 max-w-[640px] text-center text-[13px] leading-snug text-muted'>
          {t('changeDates.rulesNote')}
        </p>
      </div>

      {hasRange && (
        <div className='border-t border-gray/30 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='min-w-0'>
            {quote?.eligible ? (
              <div className='text-sm'>
                <p className='font-semibold text-dark'>
                  {t('changeDates.newStay', {
                    from: dayjs(range!.from).format('DD.MM.YYYY'),
                    to: dayjs(range!.to).format('DD.MM.YYYY'),
                    nights,
                  })}
                </p>
                {/* Show the arithmetic, not just the result: a bare "we refund
                    X" gives the guest no way to tell whether X is right. */}
                <dl className='mt-1 space-y-0.5'>
                  <div className='flex justify-between gap-6 text-muted'>
                    <dt>{t('changeDates.breakdownPaid')}</dt>
                    <dd className='tabular-nums'>
                      {money(quote.oldRoomCents ?? 0, currency, locale)}
                    </dd>
                  </div>
                  <div className='flex justify-between gap-6 text-muted'>
                    <dt>{t('changeDates.breakdownNew')}</dt>
                    <dd className='tabular-nums'>
                      {money(quote.newRoomCents ?? 0, currency, locale)}
                    </dd>
                  </div>
                  <div className='flex justify-between gap-6 border-t border-gray/30 pt-0.5 font-semibold text-dark'>
                    <dt>
                      {isTopUp
                        ? t('changeDates.breakdownTopUp')
                        : refundCents > 0
                          ? t('changeDates.breakdownRefund')
                          : t('changeDates.breakdownSame')}
                    </dt>
                    {(isTopUp || refundCents > 0) && (
                      <dd className='tabular-nums'>
                        {money(isTopUp ? topUpCents : refundCents, currency, locale)}
                      </dd>
                    )}
                  </div>
                </dl>
              </div>
            ) : quote ? (
              <p className='text-sm font-medium text-cancelled'>{refusalText(quote.reason)}</p>
            ) : (
              <p className='text-sm font-semibold text-dark'>
                {t('changeDates.nightsPrefix')} <strong>{nights}</strong>{' '}
                {t('changeDates.nightsSuffix')}
              </p>
            )}
          </div>

          <div className='flex gap-3 w-full sm:w-auto'>
            <Button
              className='flex-1 sm:flex-0 sm:min-w-[160px] h-[45px]'
              variant='outline'
              onClick={reset}
              disabled={isQuoting || isApplying}
            >
              {t('changeDates.cancel')}
            </Button>

            {isTopUp ? (
              <Button
                className='flex-1 sm:flex-0 sm:min-w-[208px] h-[45px]'
                variant='default'
                onClick={() =>
                  router.push(
                    `${localePrefix}/profile/reservations/${encodeURIComponent(reservationId)}` +
                      `/rebook-payment?from=${dayjs(range!.from).format('YYYY-MM-DD')}` +
                      `&to=${dayjs(range!.to).format('YYYY-MM-DD')}`,
                  )
                }
              >
                {t('changeDates.payButton')}
              </Button>
            ) : quote?.eligible ? (
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    className='flex-1 sm:flex-0 sm:min-w-[208px] h-[45px]'
                    variant='default'
                    disabled={isApplying}
                  >
                    {t('changeDates.confirm')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className='text-1xl'>{t('changeDates.confirmTitle')}</DialogTitle>
                  </DialogHeader>
                  <p className='text-sm text-muted'>
                    {t('changeDates.confirmBody', {
                      from: dayjs(range!.from).format('DD.MM.YYYY'),
                      to: dayjs(range!.to).format('DD.MM.YYYY'),
                    })}
                    {refundCents > 0
                      ? ' ' +
                        t('changeDates.confirmRefund', {
                          amount: money(refundCents, currency, locale),
                        })
                      : ''}
                  </p>
                  <div className='flex gap-2 justify-center pt-4'>
                    <Button className='flex-1 h-[45px]' onClick={onConfirm} disabled={isApplying}>
                      {isApplying ? t('changeDates.applying') : t('changeDates.confirm')}
                    </Button>
                    <Button
                      variant='outline'
                      className='flex-1 h-[45px]'
                      onClick={() => setConfirmOpen(false)}
                      disabled={isApplying}
                    >
                      {t('changeDates.back')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                className='flex-1 sm:flex-0 sm:min-w-[208px] h-[45px]'
                variant='default'
                onClick={onCheck}
                disabled={isQuoting}
              >
                {isQuoting ? t('changeDates.loading') : t('changeDates.check')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChangeDates
