'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toYmd } from '@/app/hooks/useMonthAvailability'

/**
 * Which nights the guest's OWN studio is taken, for the date-change calendar.
 *
 * Mirrors useMonthAvailability's shape so the calendar can swap between the two
 * signals, but asks a different question: that hook reports whether ANY studio
 * of the category is free, and a date change is only offered when the guest
 * keeps their exact one.
 *
 * Nights are accumulated across the months the guest pages through, and a
 * window that has not loaded (or failed) reads as free — the quote is the
 * authority, so a calendar miss costs a refusal, never money.
 *
 * `hasUnit` is false when Apaleo has assigned no studio yet. The quote skips
 * its own-unit check in that case, so the caller should fall back to category
 * availability rather than treating everything as free.
 */

interface UnitAvailabilityResponse {
  unitId: string | null
  occupied: string[]
  complete: boolean
}

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 5000

export function useUnitAvailability(
  reservationId: string,
  from: string | null,
  to: string | null,
  enabled = true,
) {
  const [occupied, setOccupied] = useState<Record<string, true>>({})
  const [hasUnit, setHasUnit] = useState<boolean | null>(null)
  const [loadedWindows, setLoadedWindows] = useState(0)
  const [, setRetryTick] = useState(0)
  const requestedRef = useRef<Record<string, true>>({})
  const retriesRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!enabled || !from || !to || !reservationId) return
    const key = `${reservationId}|${from}|${to}`
    if (requestedRef.current[key]) return
    requestedRef.current[key] = true

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    fetch(
      `/api/reservations/${encodeURIComponent(reservationId)}/unit-availability` +
        `?from=${from}&to=${to}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: UnitAvailabilityResponse) => {
        if (cancelled) return
        retriesRef.current[key] = 0
        setHasUnit(Boolean(data.unitId))
        // A truncated read is not proof of a free night, so do not count the
        // window as loaded — the calendar keeps using category availability.
        if (data.complete) {
          setOccupied((prev) => {
            const next = { ...prev }
            for (const d of data.occupied) next[d] = true
            return next
          })
          setLoadedWindows((n) => n + 1)
        }
      })
      .catch(() => {
        // Clear the marker and retry a couple of times; a bare clear would not
        // re-run the effect on its own since the deps have not changed.
        delete requestedRef.current[key]
        const attempts = retriesRef.current[key] ?? 0
        if (attempts >= MAX_RETRIES) return
        retriesRef.current[key] = attempts + 1
        retryTimer = setTimeout(() => {
          if (!cancelled) setRetryTick((t) => t + 1)
        }, RETRY_DELAY_MS)
      })

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [reservationId, from, to, enabled])

  const isUnitBusy = useCallback((day: Date) => occupied[toYmd(day)] === true, [occupied])

  /** Does [from, to) cross a night somebody else holds? Departure night excluded. */
  const rangeHasBusyNight = useCallback(
    (start: Date, end: Date) => {
      for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        if (occupied[toYmd(d)]) return true
      }
      return false
    },
    [occupied],
  )

  const firstBusyNight = useCallback(
    (start: Date, end: Date) => {
      for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        if (occupied[toYmd(d)]) return new Date(d)
      }
      return null
    },
    [occupied],
  )

  return {
    isUnitBusy,
    rangeHasBusyNight,
    firstBusyNight,
    /** Apaleo has a studio assigned, so the quote WILL enforce the own-unit rule. */
    hasUnit: hasUnit === true,
    /** At least one window has loaded, so the greying can be trusted. */
    ready: loadedWindows > 0,
  }
}
