import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { ensureBreakfastToken, guestView } from '@/services/breakfast'

/**
 * The guest's breakfast link for one reservation — admin only.
 *
 * Two jobs. It is what the Guestway message will send once that is wired, and
 * until then it is the only way to get at the guest page at all, which makes it
 * the way to try the feature on a real booking.
 *
 * Admin-gated deliberately: the token is a bearer credential for someone else's
 * breakfast, so handing one out on an open endpoint would let anyone rewrite a
 * stranger's choices by guessing reservation ids. (The admin PANEL itself has
 * no layout gate — ISSUE-03 — so every admin route carries its own guard.)
 *
 * Creating a token is idempotent: the same reservation always gets the same
 * one, because the guest may already have the QR saved.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const reservationId = (request.nextUrl.searchParams.get('reservationId') ?? '').trim()
  if (!reservationId) {
    return NextResponse.json({ ok: false, error: 'reservationId required' }, { status: 400 })
  }

  const token = await ensureBreakfastToken(reservationId)

  // Report what the guest would actually see, so a blank page is diagnosed
  // here rather than by opening the link and guessing. `mornings: 0` almost
  // always means no breakfast is booked on this reservation in Apaleo.
  const view = await guestView(token, 'en')

  const origin = request.nextUrl.origin
  return NextResponse.json(
    {
      ok: true,
      reservationId,
      token,
      url: `${origin}/breakfast/${token}`,
      urlDe: `${origin}/breakfast/${token}?lang=de`,
      qr: `${origin}/api/public/breakfast/${token}/qr`,
      mornings: view?.mornings.length ?? 0,
      needsChoice: view?.needsChoice ?? false,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
