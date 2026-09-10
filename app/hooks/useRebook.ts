import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'

/**
 * Moving a booking to different dates.
 *
 * Two steps on purpose. The quote is read-only and the guest sees the money
 * before anything happens; the apply re-quotes server-side and never trusts a
 * number that travelled through the browser — so a stale or edited quote cannot
 * decide what gets refunded.
 */

/** Mirrors RebookRefusal in services/apaleo/rebookDates.ts. */
export type RebookRefusal =
  | 'not-found'
  | 'not-own-channel'
  | 'not-confirmed'
  | 'not-refundable'
  | 'deadline-passed'
  | 'already-rebooked'
  | 'dates-invalid'
  | 'too-far-ahead'
  | 'no-offer'
  | 'rate-plan-mismatch'
  | 'unit-unavailable'
  | 'top-up-required'
  | 'price-unreadable'
  | 'needs-manual'

export interface RebookQuote {
  eligible: boolean
  reason?: RebookRefusal
  /** Cents. Present only when eligible. */
  oldRoomCents?: number
  newRoomCents?: number
  /** <0 we refund, >0 the guest pays the difference through the top-up flow,
   *  0 a straight swap. */
  deltaCents?: number
  currency?: string
}

export interface RebookResult {
  ok: true
  refunded: boolean
  refundRequestedCents?: number
  currency?: string
  /** The refund could not be fully placed — staff will settle it by hand. */
  manualReview?: boolean
}

interface DateRangeParams {
  from: Date
  to: Date
}

/** Carries the server's refusal code so the panel can say WHY, not just "failed". */
export class RebookError extends Error {
  reason?: RebookRefusal
  constructor(message: string, reason?: RebookRefusal) {
    super(message)
    this.name = 'RebookError'
    this.reason = reason
  }
}

const ymd = (d: Date) => dayjs(d).format('YYYY-MM-DD')

/**
 * Price a move. Costs a round of Apaleo reads, so it is wired to an explicit
 * button rather than to every change of the calendar selection.
 */
export const useRebookQuote = (reservationId: string) => {
  return useMutation<RebookQuote, Error, DateRangeParams>({
    mutationFn: async ({ from, to }) => {
      const res = await fetch(
        `/api/reservations/${encodeURIComponent(reservationId)}/rebook` +
          `?from=${ymd(from)}&to=${ymd(to)}`,
      )
      // A refusal is a 200 with eligible:false — only a real fault is non-OK.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new RebookError(body?.error ?? 'quote-failed', body?.reason)
      }
      return res.json()
    },
  })
}

/** Apply the move. The server re-quotes; these dates are the only input. */
export const useApplyRebook = (reservationId: string) => {
  return useMutation<RebookResult, Error, DateRangeParams>({
    mutationFn: async ({ from, to }) => {
      const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/rebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: ymd(from), to: ymd(to) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new RebookError(body?.error ?? 'apply-failed', body?.reason)
      }
      return body as RebookResult
    },
  })
}
