import { NextRequest, NextResponse } from 'next/server'
import { Fetch } from '@/services/Request'
import { ApaleoReservationResponse } from '@/types/apaleo'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { bookingLog } from '@/lib/logger'

/**
 * Link a reservation to the caller's (anonymous) session so the ownership-gated
 * cabinet routes recognise it.
 *
 * Used by the in-room QR page (/room/{token}), which has ALREADY proved the
 * guest's identity: it matched the surname against the reservation currently
 * checked into that physical room. This route therefore does not re-ask for a
 * last name — the proof happened one step earlier, against a stronger claim
 * (being in the room) than a name alone.
 *
 * Kept narrow on purpose: rate-limited, property-guarded (the id must be a real
 * CMH reservation, not one from the other hotel on the shared Apaleo account),
 * and a session is required so the link binds to a real user row.
 *
 * Same table shape as the manual add-by-ID flow in
 * app/api/reservations/search-booking — keep the two in sync.
 */
const notFound = () => NextResponse.json({ error: 'Reservation not found' }, { status: 404 })

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit('open-reservation', getClientIp(request))) {
      return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const reservationId = typeof body.reservationId === 'string' ? body.reservationId.trim() : ''
    if (!reservationId || reservationId.length > 64 || !/^[A-Za-z0-9-]+$/.test(reservationId)) {
      return NextResponse.json({ error: 'Invalid reservation ID' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    const propertyId = process.env.APALEO_PROPERTY_ID
    let reservation: ApaleoReservationResponse
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}?propertyIds=${propertyId}&expand=booker`,
      )
    } catch {
      return notFound()
    }
    if (!reservation || reservation.property?.id !== propertyId) {
      return notFound()
    }

    // OTA (Airbnb) reservations often carry no guest email or last name in
    // Apaleo, and both columns are NOT NULL — fall back to '' rather than null.
    const { error } = await supabase.from('reservations').upsert(
      {
        user_id: user.id,
        reservation_id: reservationId,
        booking_id: reservation.bookingId || '',
        last_name: reservation.primaryGuest?.lastName || '',
        email: reservation.primaryGuest?.email || '',
      },
      { onConflict: 'user_id,reservation_id', ignoreDuplicates: true },
    )
    if (error) {
      bookingLog.error('open-reservation: failed to link reservation', {
        reservationId,
        error: error.message,
      })
      return NextResponse.json({ error: 'Failed to open reservation' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, reservationId })
  } catch (error) {
    bookingLog.error('open-reservation: unhandled exception', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
