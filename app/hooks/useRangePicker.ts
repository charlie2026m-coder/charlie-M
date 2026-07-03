'use client'
import { useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'

/**
 * Smart click logic for range-mode calendars.
 *
 * Pattern: any click before the current start = move the start date back
 * (stay in "picking checkout" mode). Click after start = complete range.
 * Click when no range is active or after a completed one = start fresh.
 *
 * Pair `reset()` with the popover's onOpen so reopening the calendar always
 * begins from "picking checkin" — even if the store already has a range.
 */
export function useRangePicker(opts: {
  onChange: (range: DateRange | undefined) => void
  onErrorClear?: () => void
  // Return false to REJECT completing this [from, to] range (e.g. it crosses a
  // sold-out night). The pick stays on "checkout" with the check-in kept, and
  // onInvalid fires so the caller can show a message — no silent restart.
  validate?: (from: Date, to: Date) => boolean
  onInvalid?: (from: Date, to: Date) => void
  // When true, clicking the SAME day as the check-in completes a 1-night stay
  // (checkout = the next morning) and validates against that real checkout —
  // instead of the legacy 0-night {from:start,to:start}. Opt-in so unrelated
  // flows (ChangeDate, ExtandYourStay) keep their existing behavior.
  sameDayAsOneNight?: boolean
}) {
  const { onChange, onErrorClear, validate, onInvalid, sameDayAsOneNight } = opts
  const [pickingCheckout, setPickingCheckout] = useState(false)
  const checkinRef = useRef<Date | undefined>(undefined)

  const onSelect = (_range: DateRange | undefined, triggerDate: Date) => {
    if (!pickingCheckout) {
      checkinRef.current = triggerDate
      onChange({ from: triggerDate, to: undefined })
      setPickingCheckout(true)
    } else {
      const start = checkinRef.current!
      if (triggerDate.getTime() >= start.getTime()) {
        // The real checkout for a same-day click is the NEXT morning (1 night)
        // when opted in — so validation/min-stay see the true range, not from==to.
        const checkout =
          sameDayAsOneNight && triggerDate.getTime() === start.getTime()
            ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
            : triggerDate
        if (validate && !validate(start, checkout)) {
          // Invalid completion (crosses an unavailable night, too short, etc.):
          // surface a message AND restart the pick from the clicked date —
          // otherwise the guest is stuck with every further click read as a
          // checkout for the OLD check-in. (For a same-day click triggerDate
          // equals start, so this just keeps the check-in and stays picking.)
          onInvalid?.(start, checkout)
          checkinRef.current = triggerDate
          onChange({ from: triggerDate, to: undefined })
          onErrorClear?.()
          return
        }
        onChange({ from: start, to: checkout })
        checkinRef.current = undefined
        setPickingCheckout(false)
      } else {
        checkinRef.current = triggerDate
        onChange({ from: triggerDate, to: undefined })
      }
    }
    onErrorClear?.()
  }

  const reset = () => {
    setPickingCheckout(false)
    checkinRef.current = undefined
  }

  return { onSelect, reset }
}
