import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Fetch } from '@/services/Request';

// Two-step ownership check:
// 1. Fast path: reservations table linked to user_id (covers platform bookings)
// 2. Fallback: compare booker email from Apaleo with user.email (covers OTA / offline / direct bookings)
//
// Pass `cachedBookerEmail` if the route already has the reservation fetched, to avoid
// an extra Apaleo round-trip in the fallback path.

type Result =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function verifyReservationOwnership(
  supabase: SupabaseClient,
  user: User,
  reservationId: string,
  options?: { cachedBookerEmail: string | null | undefined }
): Promise<Result> {
  const { data: ownership } = await supabase
    .from('reservations')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('user_id', user.id)
    .single();

  if (ownership) return { ok: true };

  // Fallback — get booker email
  let bookerEmail: string | null | undefined;
  if (options) {
    bookerEmail = options.cachedBookerEmail;
  } else {
    try {
      const reservation = await Fetch<{ booker?: { email?: string } }>(
        `/booking/v1/reservations/${reservationId}?expand=booker`
      );
      bookerEmail = reservation?.booker?.email;
    } catch {
      return { ok: false, status: 404, error: 'Reservation not found' };
    }
  }

  const normalizedBooker = bookerEmail?.toLowerCase();
  const normalizedUser = user.email?.toLowerCase();

  if (!normalizedBooker || !normalizedUser || normalizedBooker !== normalizedUser) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true };
}
