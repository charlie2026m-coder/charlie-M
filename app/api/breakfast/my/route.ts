import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership'
import { ensureBreakfastToken, guestView } from '@/services/breakfast'

/**
 * The signed-in guest's own breakfast, for the card in their account.
 *
 * Distinct from the token route on purpose. That one is opened from a message,
 * where the unguessable token IS the credential; this one is opened from an
 * account, where the session is. Handing the token out here would otherwise be
 * an IDOR waiting to happen — anyone could ask for a stranger's reservation id
 * and get a link that rewrites their breakfast — so ownership is checked with
 * the same helper the rest of the account uses before the token is minted.
 *
 * Read-only. Changing the choice happens on the token page, which is one screen
 * for both the message and the account rather than two that drift apart.
 */
export async function GET(request: NextRequest) {
  const reservationId = (request.nextUrl.searchParams.get('reservationId') ?? '').trim()
  if (!reservationId) {
    return NextResponse.json({ ok: false, error: 'reservationId required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ownership = await verifyReservationOwnership(supabase, user, reservationId)
  if (!ownership.ok) {
    return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status })
  }

  const locale = request.nextUrl.searchParams.get('locale') === 'de' ? 'de' : 'en'
  const token = await ensureBreakfastToken(reservationId)
  const view = await guestView(token, locale)

  return NextResponse.json(
    {
      ok: true,
      // Only handed over once ownership is proven, and only for this guest's
      // own reservation.
      url: `/breakfast/${token}`,
      mornings: view?.mornings ?? [],
      needsChoice: view?.needsChoice ?? false,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
