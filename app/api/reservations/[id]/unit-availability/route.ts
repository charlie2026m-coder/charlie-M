import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership'
import { getUnitOccupiedNights } from '@/services/apaleo/getUnitOccupiedNights'
import { loadReservationForAmend } from '@/services/apaleo/amendStayTime'

/**
 * Which nights the guest's own studio is taken, for painting the date-change
 * calendar.
 *
 * A date change is only offered when the guest keeps their exact studio, so the
 * calendar has to grey out by THAT unit, not by the category. Category
 * availability is the wrong signal twice over: it counts a studio as taken when
 * any other guest holds one, and it counts the guest's OWN booking against
 * them, so shortening a stay looked impossible.
 *
 * `unitId: null` means Apaleo has not assigned a studio yet — the quote skips
 * its own-unit check in that case, so the caller should fall back to category
 * availability and the two stay in step.
 *
 * Read-only, and behind the same access check as the rest of the reservation.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const access = await verifyReservationOwnership(supabase, user, id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'from and to are required (YYYY-MM-DD)' }, { status: 400 })
  }
  if (to <= from) {
    return NextResponse.json({ error: 'to must be after from' }, { status: 400 })
  }

  // Read the unit from the SAME source the quote uses, not from the access
  // check: that fetch expands only `booker`, so `unit` is not on it — and even
  // if it were, two different reads could disagree about which studio this is.
  const ctx = await loadReservationForAmend(id)
  const unitId = ctx?.unitId
  if (!unitId) {
    return NextResponse.json(
      { unitId: null, occupied: [], complete: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Excludes this reservation: it still occupies the unit on its OLD dates,
  // which is exactly the window a guest shortening or shifting their stay wants.
  const { occupied, complete } = await getUnitOccupiedNights(unitId, from, to, id)

  return NextResponse.json(
    { unitId, occupied, complete },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
