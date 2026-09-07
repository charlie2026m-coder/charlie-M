import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { berlinToday, kitchenReport, nightToMorning } from '@/services/breakfast'

/**
 * What the kitchen cooks on a given morning — admin only.
 *
 * It names guests and rooms, which is reason enough, but the stronger one is
 * that it sweeps every reservation staying that night out of Apaleo. That is an
 * expensive answer to give to anybody who asks.
 *
 * Defaults to tomorrow, not today: this is read the evening before, when the
 * question is what to prep. Today's number is one click away.
 */
const ISO = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const asked = (request.nextUrl.searchParams.get('morning') ?? '').trim()
  const morning = ISO.test(asked) ? asked : nightToMorning(berlinToday())

  const locale = request.nextUrl.searchParams.get('locale') === 'de' ? 'de' : 'en'
  const report = await kitchenReport(morning, locale)

  return NextResponse.json(
    { ok: true, ...report },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
