import { NextRequest, NextResponse } from 'next/server'
import { getUnitFreeUntil } from '@/services/apaleo/getUnitFreeUntil'

/**
 * How far the guest can extend without changing studio.
 *
 * Asked once when the extension panel opens, so the calendar can show a real
 * boundary instead of greying dates out one probe at a time — and so a guest
 * whose room is taken immediately is told straight away rather than hunting
 * for a selectable date that does not exist.
 */
export async function GET(request: NextRequest) {
  const unitId = request.nextUrl.searchParams.get('unitId')
  const from = request.nextUrl.searchParams.get('from')

  if (!unitId || !from) {
    return NextResponse.json({ error: 'unitId and from are required' }, { status: 400 })
  }

  const freeUntil = await getUnitFreeUntil(unitId, from)
  return NextResponse.json({
    freeUntil,
    // Nothing to sell: someone else moves in the day they check out.
    unitTakenImmediately: freeUntil <= from,
  })
}
