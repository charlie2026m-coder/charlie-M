'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMonthAvailability, type DayAvailability } from '@/app/actions/apaleo/getMonthAvailability';

/** Local YYYY-MM-DD (matches how Apaleo night dates are keyed). */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Loads real per-night availability for the visible calendar window and keeps a
 * running map across months the user navigates to. Exposes `isSoldOut(date)`
 * for the Calendar's `disabled`/`modifiers`.
 *
 * Unknown dates (data not loaded yet) are treated as NOT sold out, so the
 * calendar never blocks a date just because its month hasn't been fetched.
 */
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

export function useMonthAvailability(
  from: string | null,
  to: string | null,
  unitGroupId?: string,
) {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [retryTick, setRetryTick] = useState(0);
  const requestedRef = useRef<Record<string, true>>({});
  const retriesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!from || !to) return;
    const key = `${from}|${to}|${unitGroupId ?? ''}`;
    if (requestedRef.current[key]) return;
    requestedRef.current[key] = true;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    getMonthAvailability(from, to, unitGroupId)
      .then((days) => {
        if (cancelled) return;
        retriesRef.current[key] = 0;
        setAvailability((prev) => {
          const next = { ...prev };
          for (const d of days) next[d.date] = d;
          return next;
        });
      })
      .catch(() => {
        // Failed fetch: clear the marker and retry up to MAX_RETRIES times
        // with a delay (a bare marker-clear never re-ran the effect — its
        // deps hadn't changed). After that the window simply stays unknown:
        // unknown dates remain selectable and the search itself validates.
        delete requestedRef.current[key];
        const attempts = retriesRef.current[key] ?? 0;
        if (attempts >= MAX_RETRIES) return;
        retriesRef.current[key] = attempts + 1;
        retryTimer = setTimeout(() => {
          if (!cancelled) setRetryTick((t) => t + 1);
        }, RETRY_DELAY_MS);
      });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [from, to, unitGroupId, retryTick]);

  const isSoldOut = useCallback(
    (date: Date): boolean => {
      const entry = availability[toYmd(date)];
      return entry ? !entry.available : false;
    },
    [availability],
  );

  /** Loaded availability for a day, or undefined when not yet known. */
  const dayAvailability = useCallback(
    (date: Date): DayAvailability | undefined => availability[toYmd(date)],
    [availability],
  );

  /**
   * True when any NIGHT in [from, to) is sold out — night semantics, so the
   * checkout day's own night (to) is NOT included (you leave that morning).
   * Shared so every calendar (search + room page) enforces the same rule
   * instead of each re-deriving it (review finding #5).
   */
  const rangeHasSoldOutNight = useCallback(
    (from: Date, to: Date): boolean => {
      for (const night = new Date(from); night < to; night.setDate(night.getDate() + 1)) {
        if (isSoldOut(night)) return true;
      }
      return false;
    },
    [isSoldOut],
  );

  /** The first sold-out NIGHT in [from, to), or null — used to name the night
   *  that blocks a range in the calendar's "pick other dates" message. */
  const firstSoldOutNight = useCallback(
    (from: Date, to: Date): Date | null => {
      for (const night = new Date(from); night < to; night.setDate(night.getDate() + 1)) {
        if (isSoldOut(night)) return new Date(night);
      }
      return null;
    },
    [isSoldOut],
  );

  return { availability, isSoldOut, dayAvailability, rangeHasSoldOutNight, firstSoldOutNight };
}
