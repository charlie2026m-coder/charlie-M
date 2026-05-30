import { bookingStatuses } from '@/types/types';
import type { Reservation } from '@/types/apaleo';

// Invoice is offered only once the guest has fully checked out.
// Date-based fallback intentionally removed: offering the button to an InHouse
// guest on checkout day triggers premature folio closing before final charges
// (minibar, late services) are posted. Apaleo sets CheckedOut synchronously.
export function canShowInvoice(
  reservation: Pick<Reservation, 'status'>,
): boolean {
  return reservation.status === bookingStatuses.CheckedOut;
}
