import { bookingStatuses } from '@/types/types';
import type { Reservation } from '@/types/apaleo';

// Invoice is offered once nothing further can be charged to the folio: the
// guest has checked out, or never turned up.
//
// NoShow belongs here as much as CheckedOut. A no-show is billed — Apaleo
// posts a No-Show fee and the OTA payment settles against it — so the guest
// paid and is entitled to the document. Nothing more can land on that folio
// either, since the guest will not arrive.
//
// Date-based fallback intentionally removed: offering the button to an InHouse
// guest on checkout day triggers premature folio closing before final charges
// (minibar, late services) are posted. Apaleo sets CheckedOut synchronously.
export function canShowInvoice(
  reservation: Pick<Reservation, 'status'>,
): boolean {
  return reservation.status === bookingStatuses.CheckedOut
    || reservation.status === bookingStatuses.NoShow;
}

/**
 * May this guest move their stay to other dates?
 *
 * Decided on the server so the button and the panel cannot disagree: the check
 * compares the free-cancellation deadline against the current time, and two
 * evaluations a second apart could otherwise answer differently.
 *
 * Refundable and still free to cancel, on our own channel. Past the deadline
 * cancelling costs the full stay, so a free move would be a way around the
 * penalty; and an OTA booking is governed by the platform's terms, not ours.
 */
export function canChangeDates(
  reservation: Pick<Reservation, 'status' | 'channelCode' | 'cancellationFee'>,
): boolean {
  if (reservation.status !== bookingStatuses.Confirmed) return false;
  if (!['ibe', 'direct'].includes((reservation.channelCode ?? '').toLowerCase())) return false;
  if (reservation.cancellationFee?.code !== 'FLEX') return false;
  const dueMs = reservation.cancellationFee?.dueDateTime
    ? Date.parse(reservation.cancellationFee.dueDateTime)
    : NaN;
  // Fails CLOSED on an unparseable deadline: `Date.now() < NaN` is false.
  return Number.isFinite(dueMs) && Date.now() < dueMs;
}
