import { Fetch } from '@/services/Request';
import type { ApaleoReservationResponse } from '@/types/apaleo';

interface VerifyResult {
  ok: true;
  reservation: ApaleoReservationResponse;
}

interface VerifyError {
  ok: false;
  status: number;
  error: string;
}

/**
 * Verify that a reservation exists and belongs to this property.
 *
 * The reservation ID itself is the credential — same trust model used by
 * `/api/reservations/search-booking`. Knowing the ID grants access. No
 * email match, no local `reservations` table linkage required, which keeps
 * the invoice flow working for guest sessions (anonymous Supabase login
 * via booking ID) and for registered users alike.
 */
export async function verifyReservationInProperty(
  reservationId: string,
): Promise<VerifyResult | VerifyError> {
  let reservation: ApaleoReservationResponse;
  try {
    reservation = await Fetch<ApaleoReservationResponse>(
      `/booking/v1/reservations/${encodeURIComponent(reservationId)}`,
    );
  } catch {
    return { ok: false, status: 404, error: 'Reservation not found' };
  }

  if (reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
    return { ok: false, status: 404, error: 'Reservation not found' };
  }

  return { ok: true, reservation };
}
