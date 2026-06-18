'use client';
import { cn, getDate, getPath, getMinArrivalDate } from '@/lib/utils';
import { trackSearch } from '@/lib/analytics';
import { useEffect, useId, useRef, useState } from 'react';
import { RiSearchLine } from "react-icons/ri";
import { DateInput } from '@/app/_components/ui/DateInput';
import { Guests } from '@/app/_components/ui/guests';
import { Calendar } from '@/app/_components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Button } from '@/app/_components/ui/button'
import { useRouter } from 'next/navigation';
import { usePathname } from '@/navigation';
import { useStore } from '@/store/useStore';
import { UrlParams } from '@/types/apaleo';
import { useTranslations } from 'next-intl';
import { useMonthAvailability, toYmd } from '@/app/hooks/useMonthAvailability';
import { getPrices } from '@/app/actions/apaleo/rooms/getPrices';


const CheckInForm = ({ className = '', params }: { className?: string, params?: UrlParams }) => {
  const t = useTranslations('dateInput');
  const { dateRange, guests, setValue } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const isRoomsPage = pathname === '/rooms';
  const [openCalendar, setOpenCalendar] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [numberOfMonths, setNumberOfMonths] = useState(1);
  const [pickingCheckout, setPickingCheckout] = useState(false);
  const checkinRef = useRef<Date | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Unique id stamped on THIS form's calendar panel so the scroll-into-view
  // handler measures its own calendar, not another popover on the page.
  const panelId = useId();
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    // Deep-links carry ?from= for a future month — the calendar must open
    // (and fetch availability for) THAT month, not today's (review #6).
    const fromParam = params?.from ? new Date(params.from) : undefined;
    if (fromParam && !isNaN(fromParam.getTime())) return fromParam;
    // Default to the minimum arrival date (= today, or tomorrow after the 23:30
    // Berlin cutoff). Using getMinArrivalDate() rather than `new Date()` keeps
    // the seed date inside the fetched availability window even on the last day
    // of a month after cutoff, where it rolls into next month (review-fix #4).
    return dateRange?.from ?? getMinArrivalDate();
  });
  const [fromPrice, setFromPrice] = useState<number | null>(null);

  // Real per-night availability for the visible window (current + next month
  // when two are shown). Sold-out nights become non-selectable.
  const availFrom = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
  const availTo = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + numberOfMonths, 1));
  // The custom two-click onSelect below bypasses the library's excludeDisabled
  // truncation, so a completed range is re-checked against sold-out nights via
  // the shared helper (same rule in BookingForm — review #5).
  const { isSoldOut, rangeHasSoldOutNight } = useMonthAvailability(availFrom, availTo);

  useEffect(() => {
    const update = () => setNumberOfMonths(window.innerWidth >= 1024 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const minArrivalDate = getMinArrivalDate()

  // "from €X / night" for the selected range — the cheapest real offer across
  // rooms (same source as the rooms list). Null when no offer exists, so we
  // never show a made-up price.
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) { setFromPrice(null); return; }
    const f = getDate(dateRange.from);
    const t = getDate(dateRange.to);
    if (!f || !t) { setFromPrice(null); return; }
    let cancelled = false;
    getPrices(f, t, guests.adults + guests.children)
      .then((prices) => {
        if (cancelled) return;
        const valid = prices.map((p) => p.minNightPrice).filter((p) => p > 0);
        setFromPrice(valid.length ? Math.min(...valid) : null);
      })
      .catch(() => { if (!cancelled) setFromPrice(null); });
    return () => { cancelled = true; };
  }, [dateRange?.from, dateRange?.to, guests.adults, guests.children]);

  // Late-arriving availability (review #14): a range selected before the data
  // loaded (or restored from URL params) may cross a sold-out night — drop it
  // as soon as we know, so a stale selection never reaches the search.
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    if (!rangeHasSoldOutNight(dateRange.from, dateRange.to)) return;
    setValue({ from: undefined, to: undefined }, 'dateRange');
    checkinRef.current = undefined;
    setPickingCheckout(false);
  }, [dateRange?.from, dateRange?.to, rangeHasSoldOutNight, setValue]);

  // Handle URL params
  useEffect(() => {
    if (params) {
      if (params.from && params.to) {
        const fromDate = new Date(params.from);
        const toDate = new Date(params.to);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setValue({ from: fromDate, to: toDate }, 'dateRange');
        }
      }
      if (params.adults !== undefined || params.children !== undefined) {
        setValue({
          adults: params.adults ? Number(params.adults) : 1,
          children: params.children ? Number(params.children) : 0,
        }, 'guests');
      }
    }
  }, [params, setValue])

  // No seeded default range — the calendar opens empty so the guest clearly
  // picks their own dates. Deep-link ?from/?to and a stored range still populate
  // it (handled by the effects above).

  const triggerSearch = (rangeOverride?: DateRange, closeCalendar = false) => {
    const r = rangeOverride ?? dateRange;
    const hasDateError = !r?.from || !r?.to;
    setDateError(hasDateError);

    if (hasDateError) return;

    const from = getDate(r.from!) ?? '';
    const to = getDate(r.to!) ?? '';
    trackSearch({ arrival: from, departure: to, guests: guests.adults + guests.children });
    const queryString = getPath({
      from,
      to,
      adults: guests.adults.toString(),
      children: guests.children.toString(),
    });
    router.push(`/rooms?${queryString}`);
    if (closeCalendar) setOpenCalendar(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch();
  };

  const handleApply = () => {
    // Apply = run the search and close — on the home form (was a no-op that
    // only closed) and on /rooms. triggerSearch flags a date error if the
    // range is incomplete, so the button always gives feedback.
    triggerSearch(undefined, true);
  };

  // Swipe / drag (or the arrows) to change the visible month. Bounded so it
  // can't page back before the earliest bookable month.
  const navigateMonth = (dir: 1 | -1) => {
    setVisibleMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      const min = getMinArrivalDate();
      const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
      return next < minMonth ? prev : next;
    });
  };
  const swipeStartX = useRef<number | null>(null);

  const getNights = () => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const diffTime = new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime();
    const nights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (nights === 0) return null;
    return t('nights', { count: nights });
  }

  const resetForm = () => {
    setValue({ from: undefined, to: undefined }, 'dateRange');
    setOpenCalendar(false);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      data-checkin-form="original"
      className={cn('flex flex-row pl-3 md:pl-8 gap-2 md:gap-8 w-full max-w-[900px] bg-white p-3 rounded-full items-center', className)}
    >
      <label className='w-full max-w-3/5'>
        <DateInput
          value={dateRange || undefined}
          open={openCalendar}
          frosted
          onOpenChange={(open) => {
            setOpenCalendar(open);
            if (open) {
              setPickingCheckout(false);
              checkinRef.current = undefined;
              if (dateError) setDateError(false);
              // When pinned in the sticky bar the form is inside a position:fixed
              // ancestor — the calendar is anchored to the viewport top and
              // window-scrolling won't move it, so don't auto-scroll there.
              let inFixed = false;
              for (let p = formRef.current?.parentElement; p && p !== document.body; p = p.parentElement) {
                const pos = getComputedStyle(p).position;
                if (pos === 'fixed' || pos === 'sticky') { inFixed = true; break; }
              }
              if (inFixed) return;
              // Bring the downward-opening calendar into view — measured only
              // AFTER its entrance animation settles (mid-animation the rect is
              // shrunken/shifted, so the scroll under-fired — the reported bug).
              // Target THIS form's own panel by data-cal-id so a second popover
              // on the page can't be measured by mistake.
              requestAnimationFrame(() => {
                const panel = document.querySelector(
                  `[data-slot="popover-content"][data-cal-id="${CSS.escape(panelId)}"]`
                ) as HTMLElement | null;
                if (!panel) return;
                let done = false;
                let timer: ReturnType<typeof setTimeout> | undefined;
                const measureAndScroll = () => {
                  if (done) return;
                  done = true;
                  if (timer) clearTimeout(timer);
                  const rect = panel.getBoundingClientRect();
                  // Skip if not yet positioned (popper parks it off-screen until
                  // it resolves) or it opened above the fold.
                  if (rect.top < 0 || rect.top > window.innerHeight) return;
                  const desiredBottom = window.innerHeight * 0.92;
                  let delta = rect.bottom - desiredBottom;
                  if (delta > 0) {
                    // Cap the scroll so the form's OWN top can't cross the sticky
                    // threshold — that swap would hide this just-opened calendar.
                    const formTop = formRef.current?.getBoundingClientRect().top ?? Infinity;
                    delta = Math.min(delta, rect.top - 88, formTop - 96);
                    if (delta > 1) window.scrollBy({ top: delta, behavior: 'smooth' });
                  }
                };
                // Only the panel's own entrance animation should trigger it
                // (animationend bubbles up from children too).
                panel.addEventListener('animationend', (e) => {
                  if (e.target === panel) measureAndScroll();
                });
                timer = setTimeout(measureAndScroll, 360); // reduced-motion fallback
              });
            }
          }}
          panelId={panelId}
          isError={dateError}
        >
          <div
            className='pb-2 touch-pan-y select-none'
            onPointerDown={(e) => { swipeStartX.current = e.clientX }}
            onPointerUp={(e) => {
              if (swipeStartX.current === null) return
              const dx = e.clientX - swipeStartX.current
              swipeStartX.current = null
              // A real horizontal drag (not a day tap) pages the months:
              // drag left → next, drag right → previous.
              if (Math.abs(dx) < 60) return
              navigateMonth(dx < 0 ? 1 : -1)
            }}
          >
            <Calendar
              required={false}
              mode="range"
              captionLayout="label"
              numberOfMonths={numberOfMonths}
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
                    return rangeHasSoldOutNight(checkinRef.current, date);
                  }
                  return isSoldOut(date);
                },
              }}
              modifiersClassNames={{ soldOut: 'line-through' }}
              onSelect={(_date, triggerDate) => {
                if (!triggerDate) return;
                // A sold-out night can't be a CHECK-IN (the prior checkout day is
                // kept clickable only so it renders selected — never let it start
                // a new stay).
                if (!pickingCheckout && isSoldOut(triggerDate)) return;
                if (!pickingCheckout) {
                  // Клик 1 (или клик когда range уже выбран) — ставим начало
                  checkinRef.current = triggerDate;
                  setValue({ from: triggerDate, to: undefined }, 'dateRange');
                  setPickingCheckout(true);
                } else {
                  const start = checkinRef.current!;
                  if (triggerDate.getTime() > start.getTime()) {
                    if (rangeHasSoldOutNight(start, triggerDate)) {
                      // Внутри диапазона занятая ночь — так бронировать нельзя.
                      // Начинаем выбор заново с кликнутой даты (review #5).
                      checkinRef.current = triggerDate;
                      setValue({ from: triggerDate, to: undefined }, 'dateRange');
                    } else {
                      // Клик после start — завершаем range
                      const newRange = { from: start, to: triggerDate };
                      setValue(newRange, 'dateRange');
                      checkinRef.current = undefined;
                      setPickingCheckout(false);
                      // На странице /rooms полный диапазон сразу применяется
                      // (без клика по «Apply») и календарь закрывается, чтобы
                      // не перекрывать карточки комнат.
                      if (isRoomsPage) {
                        triggerSearch(newRange, true);
                      }
                    }
                  } else if (triggerDate.getTime() === start.getTime()) {
                    // Тот же день — это 0 ночей. Завершаем как 1 ночь (start..start+1),
                    // чтобы не отправлять на сервер диапазон, который он молча +1.
                    const nextDay = new Date(start);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const newRange = { from: start, to: nextDay };
                    setValue(newRange, 'dateRange');
                    checkinRef.current = undefined;
                    setPickingCheckout(false);
                    if (isRoomsPage) {
                      triggerSearch(newRange, true);
                    }
                  } else {
                    // Клик до start — двигаем start, остаёмся в режиме выбора конца
                    checkinRef.current = triggerDate;
                    setValue({ from: triggerDate, to: undefined }, 'dateRange');
                  }
                }
                if (dateError) setDateError(false);
              }}
              disabled={[
                { before: minArrivalDate },
                (date: Date) => {
                  // Keep the already-chosen checkout looking selected, not greyed.
                  if (dateRange?.to && date.getTime() === dateRange.to.getTime()) return false
                  // Picking the CHECKOUT: a sold-out day can still be a valid
                  // checkout (you leave that morning) — block it only if a NIGHT
                  // between check-in and it is sold out.
                  if (pickingCheckout && checkinRef.current && date.getTime() > checkinRef.current.getTime()) {
                    return rangeHasSoldOutNight(checkinRef.current, date)
                  }
                  // Picking the CHECK-IN: a sold-out night can't be a first night.
                  return isSoldOut(date)
                },
              ]}
              classNames={{ months: 'flex flex-col lg:flex-row gap-4' }}
            />
          </div>
          <div className='h-12 flex items-center justify-between gap-2 border-t font-semibold text-mute'>
            <span>{getNights() ?? ''}</span>
            {fromPrice != null && (
              <span className='text-dark-gold'>{t('priceFromPerNight', { price: Math.round(fromPrice) })}</span>
            )}
          </div>
          <div className={cn('grid grid-cols-2 gap-2', isRoomsPage ? '' : 'md:hidden')}>
            <Button onClick={resetForm} className='w-full text-sm md:text-base h-10' variant='outline'>{t('cancel')}</Button>
            <Button onClick={handleApply} className='w-full text-sm md:text-base h-10'>{t('apply')}</Button>
          </div>
        </DateInput>
      </label>
      <label className='w-full max-w-2/5 border-l md:border-none'>
        <Guests setValue={(value) => { setValue(value, 'guests'); }} value={guests} />
      </label>
      <Button
        className={cn('cursor-pointer size-10 active:scale-95 md:size-15 flex items-center justify-center rounded-full transition-all duration-300 bg-blue hover:bg-blue/80')}
        type='submit'
        size="icon"
      >
        <RiSearchLine className='text-mute size-5 md:size-8' />
      </Button>
    </form>
  );
};

export default CheckInForm;
