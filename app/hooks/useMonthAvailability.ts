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
export function useMonthAvailability(
  from: string | null,
  to: string | null,
  unitGroupId?: string,
) {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const requestedRef = useRef<Record<string, true>>({});

  useEffect(() => {
    if (!from || !to) return;
    const key = `${from}|${to}|${unitGroupId ?? ''}`;
    if (requestedRef.current[key]) return;
    requestedRef.current[key] = true;

    let cancelled = false;
    getMonthAvailability(from, to, unitGroupId)
      .then((days) => {
        if (cancelled) return;
        setAvailability((prev) => {
          const next = { ...prev };
          for (const d of days) next[d.date] = d;
          return next;
        });
      })
      .catch(() => {
        // Allow a retry on the next render if the fetch failed.
        delete requestedRef.current[key];
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, unitGroupId]);

  const isSoldOut = useCallback(
    (date: Date): boolean => {
      const entry = availability[toYmd(date)];
      return entry ? !entry.available : false;
    },
    [availability],
  );

  return { availability, isSoldOut };
}
