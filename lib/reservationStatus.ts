import { bookingStatuses } from '@/types/types';
import type { Reservation } from '@/types/apaleo';

// Invoice is offered only AFTER the booking period.
// "End of period" = status is CheckedOut OR today >= departure date.
// Canceled / NoShow are excluded — they don't produce a stay invoice.
export function canShowInvoice(
  reservation: Pick<Reservation, 'status' | 'departure'>,
): boolean {
  if (reservation.status === bookingStatuses.CheckedOut) return true;
  if (
    reservation.status === bookingStatuses.Canceled ||
    reservation.status === bookingStatuses.NoShow
  ) {
    return false;
  }
  if (!reservation.departure) return false;

  const departure = new Date(reservation.departure);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  departure.setUTCHours(0, 0, 0, 0);
  return departure.getTime() <= today.getTime();
}
