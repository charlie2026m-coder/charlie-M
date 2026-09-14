import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { berlinToday, breakfastOverview } from '@/services/breakfast'
import { addDays } from '@/lib/breakfastDates'

/**
 * How many people come to breakfast on each morning of a short range — the
 * numbers above the dates on the kitchen screen.
 *
 * Numbers only: no names, no rooms, no money. That is what lets the kitchen
 * login read it; the full overview, which carries revenue, stays with the
 * breakfast admins. Mornings with nobody are simply absent — the screen shows
 * a zero for them.
 *
 * Seven mornings by default, a month at most: it is a strip, not a report.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ISO = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 31

export async function GET(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast', 'kitchen'] })
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams
  const from = ISO.test(sp.get('from') ?? '') ? (sp.get('from') as string) : berlinToday()
  let to = ISO.test(sp.get('to') ?? '') ? (sp.get('to') as string) : addDays(from, 6)
  if (to < from) to = from
  const furthest = addDays(from, MAX_DAYS - 1)
  if (to > furthest) to = furthest

  const overview = await breakfastOverview(from, to)
  return NextResponse.json(
    {
      ok: true,
      from,
      to,
      days: overview.days.map(d => ({ morning: d.morning, covers: d.covers })),
      truncated: overview.truncated,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
