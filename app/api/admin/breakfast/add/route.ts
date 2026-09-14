import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { addBreakfastToReservation } from '@/services/breakfast'

/**
 * Put breakfast on an existing booking for the rest of its stay — admin only.
 *
 * Writes to Apaleo: two folio services per remaining night, at the catalogue
 * price, settled at the desk. That is a sale, which is why the kitchen's login
 * cannot reach it, and why it is a POST that a page has to ask for on purpose.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  const reservationId = String((body as { reservationId?: unknown })?.reservationId ?? '').trim()
  const persons = Number((body as { persons?: unknown })?.persons)

  if (!reservationId || !Number.isFinite(persons)) {
    return NextResponse.json({ ok: false, reason: 'bad-body' }, { status: 400 })
  }

  const result = await addBreakfastToReservation(reservationId, Math.trunc(persons))
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.reason === 'not-found' ? 404 : 409,
    headers: { 'Cache-Control': 'no-store' },
  })
}
