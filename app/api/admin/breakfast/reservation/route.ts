import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { verifyReservationInProperty } from '@/services/verifyReservationInProperty'
import { ensureBreakfastToken, guestView } from '@/services/breakfast'

/**
 * Everything the desk needs to know about one booking's breakfast — admin only.
 *
 * Who the guest is and when they stay, which mornings breakfast is paid for and
 * for how many, what they have chosen so far, and the link and QR they were (or
 * can be) sent. One screen, so a question at reception is answered without
 * opening Apaleo, the database and the guest page in turn.
 *
 * Minting the token here is deliberate: the desk may need to hand the QR to a
 * guest who never received the message, and the token is the same one the
 * message would have carried.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const reservationId = (request.nextUrl.searchParams.get('reservationId') ?? '').trim()
  if (!reservationId) {
    return NextResponse.json({ ok: false, error: 'reservationId required' }, { status: 400 })
  }

  const verified = await verifyReservationInProperty(reservationId)
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 })
  }
  const r = verified.reservation

  const token = await ensureBreakfastToken(reservationId)
  const view = await guestView(token, 'en')
  const origin = request.nextUrl.origin

  return NextResponse.json(
    {
      ok: true,
      reservation: {
        id: reservationId,
        status: String(r.status ?? ''),
        arrival: String(r.arrival ?? '').slice(0, 10),
        departure: String(r.departure ?? '').slice(0, 10),
        adults: Number(r.adults ?? 1),
        guest: [r.primaryGuest?.firstName, r.primaryGuest?.lastName].filter(Boolean).join(' '),
        room: String((r as { unit?: { name?: string } }).unit?.name ?? ''),
      },
      token,
      url: `${origin}/breakfast/${token}`,
      urlDe: `${origin}/breakfast/${token}?lang=de`,
      qr: `${origin}/api/public/breakfast/${token}/qr`,
      mornings: view?.mornings ?? [],
      needsChoice: view?.needsChoice ?? false,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
