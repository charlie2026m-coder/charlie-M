/**
 * Centralized reservation-ownership authorization.
 *
 * One source of truth for "is this user allowed to act on this reservation",
 * used by every reservation route (services, cancel, address, invoice, ...).
 *
 * Access is granted when ANY of these holds:
 *   1. Email match — the reservation's primaryGuest/booker email equals the
 *      authenticated user's email. This mirrors the trust the profile list
 *      already uses (`/api/reservations` filters by `textSearch: user.email`),
 *      so an email-logged-in owner can manage every booking they can see.
 *   2. DB link — a row in `reservations` links this user_id to the
 *      reservation_id (covers anonymous guests who linked a booking, and
 *      explicitly added reservations).
 *
 * The reservation is fetched from Apaleo (single source of truth) and the
 * property is enforced — the shared Apaleo account also serves the other
 * hotel, and Apaleo's single-resource endpoint ignores `propertyIds`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { Fetch } from '@/services/Request'
import type { ApaleoReservationResponse } from '@/types/apaleo'

interface AccessUser {
  id: string
  email?: string | null
}

export type ReservationAccess =
  | { ok: true; reservation: ApaleoReservationResponse }
  | { ok: false; status: 401 | 403 | 404 | 500; error: string }

const normalizeEmail = (email: string | null | undefined): string =>
  email?.toLowerCase().trim() ?? ''

/**
 * @param supabase server client bound to the user's session (RLS lets a user
 *   read their own `reservations` row).
 * @param user the authenticated user (anonymous users have no email).
 * @param reservationId Apaleo reservation id.
 * @param prefetched optional already-fetched Apaleo reservation to avoid a
 *   second round-trip when the caller has one.
 */
export async function assertReservationAccess(
  supabase: SupabaseClient,
  user: AccessUser | null,
  reservationId: string,
  prefetched?: ApaleoReservationResponse,
): Promise<ReservationAccess> {
  if (!user) return { ok: false, status: 401, error: 'Authentication required' }

  let reservation = prefetched
  if (!reservation) {
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('404') || message.includes('not found')) {
        return { ok: false, status: 404, error: 'Reservation not found' }
      }
      return { ok: false, status: 500, error: 'Failed to verify reservation ownership' }
    }
  }

  // Property guard — Apaleo's single-resource read ignores propertyIds.
  if (!reservation?.id || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
    return { ok: false, status: 404, error: 'Reservation not found' }
  }

  // 1) Email match (same trust as the profile listing).
  const userEmail = normalizeEmail(user.email)
  if (userEmail) {
    const reservationEmails = [
      normalizeEmail(reservation.primaryGuest?.email),
      normalizeEmail(reservation.booker?.email),
    ]
    if (reservationEmails.includes(userEmail)) {
      return { ok: true, reservation }
    }
  }

  // 2) Explicit DB link (anonymous guests, or added reservations).
  const { data: link } = await supabase
    .from('reservations')
    .select('reservation_id')
    .eq('user_id', user.id)
    .eq('reservation_id', reservationId)
    .maybeSingle()

  if (link) return { ok: true, reservation }

  return { ok: false, status: 403, error: 'Reservation not found or not owned by current user' }
}
