/**
 * Centralized reservation-ownership authorization.
 *
 * One source of truth for "is this user allowed to act on this reservation",
 * used by every reservation route (services, cancel, address, [id], full).
 *
 * Access is granted when ANY of these holds:
 *   1. Email match — the reservation's primaryGuest/booker email equals the
 *      authenticated user's email. Mirrors the profile listing, which filters
 *      `/api/reservations` by `textSearch: user.email`.
 *   2. DB link — a row in `reservations` links this user_id to the
 *      reservation_id (anonymous guests who verified number + last name, or
 *      explicitly added reservations).
 *
 * Callers that already fetched the reservation can pass `cachedBookerEmail`
 * to skip a second Apaleo round-trip on the email-match fast path.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Fetch } from '@/services/Request';
import type { ApaleoReservationResponse } from '@/types/apaleo';

interface AccessUser {
  id: string;
  email?: string | null;
}

export type OwnershipResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404 | 500; error: string };

const normalizeEmail = (email: string | null | undefined): string =>
  email?.toLowerCase().trim() ?? '';

export async function verifyReservationOwnership(
  supabase: SupabaseClient,
  user: AccessUser | null,
  reservationId: string,
  opts?: { cachedBookerEmail?: string | null },
): Promise<OwnershipResult> {
  if (!user) return { ok: false, status: 401, error: 'Authentication required' };

  const userEmail = normalizeEmail(user.email);

  if (opts && 'cachedBookerEmail' in opts) {
    // Fast path: the caller already fetched the reservation (and verified the
    // property) and handed us an email known to belong to it.
    if (userEmail && normalizeEmail(opts.cachedBookerEmail) === userEmail) {
      return { ok: true };
    }
  } else {
    // No cached email: fetch the reservation to verify property + email match.
    let reservation: ApaleoReservationResponse;
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('404') || message.includes('not found')) {
        return { ok: false, status: 404, error: 'Reservation not found' };
      }
      return { ok: false, status: 500, error: 'Failed to verify reservation ownership' };
    }

    // Apaleo's single-resource read ignores propertyIds — enforce here.
    if (!reservation?.id || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return { ok: false, status: 404, error: 'Reservation not found' };
    }

    if (userEmail) {
      const reservationEmails = [
        normalizeEmail(reservation.primaryGuest?.email),
        normalizeEmail(reservation.booker?.email),
      ];
      if (reservationEmails.includes(userEmail)) {
        return { ok: true };
      }
    }
  }

  // Explicit DB link (anonymous guests, or added reservations).
  const { data: link } = await supabase
    .from('reservations')
    .select('reservation_id')
    .eq('user_id', user.id)
    .eq('reservation_id', reservationId)
    .maybeSingle();

  if (link) return { ok: true };

  return { ok: false, status: 403, error: 'Reservation not found or not owned by current user' };
}
