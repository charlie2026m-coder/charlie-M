'use client';
import { useCallback, useEffect, useState } from 'react';
import { getBookableDepartures } from '@/app/actions/apaleo/rooms/getBookableDepartures';
import { toYmd } from '@/app/hooks/useMonthAvailability';

interface CheckoutInfo {
  departures: Set<string>;
  minNights: number | null;
  maxNights: number | null;
  windowNights: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Module-level cache shared across every calendar instance AND the background
// prefetch below — so a check-in date that was prefetched (or already looked at)
// resolves instantly with no per-click round-trip. The server action behind it
// is itself cached across visitors; this is the in-tab layer on top.
const cache = new Map<string, CheckoutInfo>();
const inflight = new Map<string, Promise<void>>();

function cacheKey(arrivalYmd: string, unitGroupId: string | undefined, guests: number) {
  return `${arrivalYmd}|${unitGroupId ?? ''}|${guests}`;
}

function loadKey(arrivalYmd: string, unitGroupId: string | undefined, guests: number): Promise<void> {
  const key = cacheKey(arrivalYmd, unitGroupId, guests);
  if (cache.has(key)) return Promise.resolve();
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = getBookableDepartures(arrivalYmd, guests, unitGroupId)
    .then((res) => {
      cache.set(key, {
        departures: new Set(res.departures),
        minNights: res.minNights,
        maxNights: res.maxNights,
        windowNights: res.windowNights,
      });
    })
    .catch(() => {
      /* leave uncached → callers stay optimistic; the search still validates */
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * Warm the cache for a batch of likely arrivals in the background (throttled),
 * so the guest's pick is instant. Cached / in-flight keys are skipped, so it's
 * safe to call on every calendar open and month change.
 */
export async function prefetchBookableCheckouts(
  arrivals: Date[],
  unitGroupId: string | undefined,
  guests: number,
  concurrency = 4,
): Promise<void> {
  const ymds = arrivals
    .map(toYmd)
    .filter((y) => !cache.has(cacheKey(y, unitGroupId, guests)));
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, ymds.length) }, async () => {
    while (i < ymds.length) {
      const y = ymds[i++];
      await loadKey(y, unitGroupId, guests);
    }
  });
  await Promise.all(workers);
}

/**
 * Given the currently-picked ARRIVAL date, exposes `isValidCheckout(date)` for
 * the calendar's `disabled` — honouring min/max length-of-stay and
 * closed-to-arrival/departure that the raw availability counts can't see.
 *
 * - `arrival` null/undefined → idle; `isValidCheckout` returns true.
 * - Loading a NEW (un-prefetched) arrival → `ready` is false and
 *   `isValidCheckout` returns true (OPTIMISTIC: never block before we know — the
 *   completed pick and the search page both re-validate).
 * - When the arrival was prefetched, the cache hit is synchronous → instant,
 *   `ready` is true on first render, no spinner.
 */
export function useBookableCheckouts(
  arrival: Date | null | undefined,
  unitGroupId?: string,
  guests: number = 1,
) {
  const [, setTick] = useState(0);
  const arrivalYmd = arrival ? toYmd(arrival) : null;
  const key = arrivalYmd ? cacheKey(arrivalYmd, unitGroupId, guests) : null;

  useEffect(() => {
    if (!arrivalYmd || !key) return;
    if (cache.has(key)) return; // already warm (prefetched) → render reads it
    let cancelled = false;
    // Tiny debounce so flicking through arrivals doesn't fire a request per day.
    const timer = setTimeout(() => {
      loadKey(arrivalYmd, unitGroupId, guests).then(() => {
        if (!cancelled) setTick((n) => n + 1);
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [arrivalYmd, key, unitGroupId, guests]);

  const info = key ? cache.get(key) : undefined;
  const ready = !!info;
  const arrivalMs = arrival ? arrival.getTime() : null;

  const isValidCheckout = useCallback(
    (date: Date): boolean => {
      if (!info) return true; // optimistic until loaded
      if (info.departures.has(toYmd(date))) return true;
      // Days beyond the probed window were never tested — stay optimistic so a
      // long stay (this is an aparthotel) isn't wrongly blocked; the search
      // validates. Only block days INSIDE the window that came back unsellable.
      if (arrivalMs != null) {
        const nights = Math.round((date.getTime() - arrivalMs) / MS_PER_DAY);
        if (nights > info.windowNights) return true;
      }
      return false;
    },
    [info, arrivalMs],
  );

  return {
    isValidCheckout,
    ready,
    minNights: info?.minNights ?? null,
    maxNights: info?.maxNights ?? null,
    hasAnyCheckout: info ? info.departures.size > 0 : true,
  };
}
