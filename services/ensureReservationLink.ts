import { Fetch } from '@/services/Request';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApaleoReservationResponse } from '@/types/apaleo';

interface User {
  id: string;
  email?: string | null;
}

interface EnsureLinkResult {
  ok: true;
  reservation: ApaleoReservationResponse;
}

interface EnsureLinkError {
  ok: false;
  status: number;
  error: string;
}

/**
 * Verify that the current user owns the Apaleo reservation by email match,
 * and upsert a row in local `reservations` so RLS-protected reads/writes on
 * dependent tables (e.g. `invoice_states`) work for users whose reservation
 * list comes straight from Apaleo (textSearch on email) without a manual link.
 *
 * Idempotent: existing rows are left untouched.
 */
export async function ensureReservationLink(
  supabase: SupabaseClient,
  user: User,
  reservationId: string,
): Promise<EnsureLinkResult | EnsureLinkError> {
  if (!user.email) return { ok: false, status: 401, error: 'No email on session' };

  let reservation: ApaleoReservationResponse;
  try {
    reservation = await Fetch<ApaleoReservationResponse>(`/booking/v1/reservations/${reservationId}`);
  } catch {
    return { ok: false, status: 404, error: 'Reservation not found' };
  }

  // Apaleo's single-resource endpoint ignores propertyIds — verify here that
  // this reservation actually belongs to the current site's property (the
  // OAuth account is shared with the sister hotel).
  if (reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
    return { ok: false, status: 404, error: 'Reservation not found' };
  }

  const apaleoEmail = reservation.primaryGuest?.email ?? reservation.booker?.email ?? '';

  if (!apaleoEmail || apaleoEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, status: 403, error: 'Not your reservation' };
  }

  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase.from('reservations').insert({
      reservation_id: reservationId,
      booking_id: reservation.bookingId ?? '',
      last_name: reservation.primaryGuest?.lastName ?? reservation.booker?.lastName ?? '',
      email: apaleoEmail,
      user_id: user.id,
    });

    if (insertError && insertError.code !== '23505') {
      return { ok: false, status: 500, error: 'Failed to link reservation' };
    }
  }

  return { ok: true, reservation };
}
