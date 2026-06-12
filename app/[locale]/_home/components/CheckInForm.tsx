'use client';
import { cn, getDate, getPath, getMinArrivalDate } from '@/lib/utils';
import { trackSearch } from '@/lib/analytics';
import { useEffect, useRef, useState } from 'react';
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
  const [hasAppliedOnce, setHasAppliedOnce] = useState(
    () => Boolean(params?.from && params?.to)
  );
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => dateRange?.from ?? new Date());
  const [fromPrice, setFromPrice] = useState<number | null>(null);

  // Real per-night availability for the visible window (current + next month
  // when two are shown). Sold-out nights become non-selectable.
  const availFrom = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
  const availTo = toYmd(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + numberOfMonths, 1));
  const { isSoldOut } = useMonthAvailability(availFrom, availTo);

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

  // Set default dates only once on mount if no params and no dateRange
  useEffect(() => {
    if (!params && (!dateRange?.from || !dateRange?.to)) {
      const from = getMinArrivalDate();
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      setValue({ from, to }, 'dateRange');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setHasAppliedOnce(true);
    if (closeCalendar) setOpenCalendar(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch();
  };

  const handleApply = () => {
    if (isRoomsPage) {
      triggerSearch(undefined, true);
      return;
    }
    setOpenCalendar(false);
  };

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
      onSubmit={handleSubmit}
      data-checkin-form="original"
      className={cn('flex flex-row pl-3 md:pl-8 gap-2 md:gap-8 w-full max-w-[900px] bg-white p-3 rounded-full items-center', className)}
    >
      <label className='w-full max-w-3/5'>
        <DateInput
          value={dateRange || undefined}
          open={openCalendar}
          onOpenChange={(open) => {
            setOpenCalendar(open);
            if (open) {
              setPickingCheckout(false);
              checkinRef.current = undefined;
              if (dateError) setDateError(false);
            }
          }}
          isError={dateError}
        >
          <div className='pb-2'>
            <Calendar
              required={false}
              mode="range"
              captionLayout="label"
              numberOfMonths={numberOfMonths}
              selected={dateRange}
              defaultMonth={visibleMonth}
              onMonthChange={setVisibleMonth}
              excludeDisabled
              modifiers={{ soldOut: isSoldOut }}
              modifiersClassNames={{ soldOut: 'line-through' }}
              onSelect={(_date, triggerDate) => {
                if (!pickingCheckout) {
                  // Клик 1 (или клик когда range уже выбран) — ставим начало
                  checkinRef.current = triggerDate;
                  setValue({ from: triggerDate, to: undefined }, 'dateRange');
                  setPickingCheckout(true);
                } else {
                  const start = checkinRef.current!;
                  if (triggerDate.getTime() > start.getTime()) {
                    // Клик после start — завершаем range
                    const newRange = { from: start, to: triggerDate };
                    setValue(newRange, 'dateRange');
                    checkinRef.current = undefined;
                    setPickingCheckout(false);
                    if (isRoomsPage && hasAppliedOnce) {
                      triggerSearch(newRange, false);
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
                    if (isRoomsPage && hasAppliedOnce) {
                      triggerSearch(newRange, false);
                    }
                  } else {
                    // Клик до start — двигаем start, остаёмся в режиме выбора конца
                    checkinRef.current = triggerDate;
                    setValue({ from: triggerDate, to: undefined }, 'dateRange');
                  }
                }
                if (dateError) setDateError(false);
              }}
              disabled={[{ before: minArrivalDate }, isSoldOut]}
              classNames={{ months: 'flex flex-col lg:flex-row gap-4' }}
            />
          </div>
          <div className='h-12 flex items-center justify-between gap-2 border-t font-semibold'>
            <span>{getNights() ?? ''}</span>
            {fromPrice != null && (
              <span className='text-blue'>{t('priceFromPerNight', { price: Math.round(fromPrice) })}</span>
            )}
          </div>
          <div className={cn('grid grid-cols-2 gap-2', isRoomsPage ? '' : 'md:hidden')}>
            <Button onClick={resetForm} className='w-full text-sm md:text-base h-10' variant='outline'>{t('cancel')}</Button>
            <Button onClick={handleApply} className='w-full text-sm md:text-base h-10'>{t('apply')}</Button>
          </div>
        </DateInput>
      </label>
      <label className='w-full max-w-2/5 border-l md:border-none'>
        <Guests setValue={(value) => { setValue(value, 'guests'); setHasAppliedOnce(false); }} value={guests} />
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
