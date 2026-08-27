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
