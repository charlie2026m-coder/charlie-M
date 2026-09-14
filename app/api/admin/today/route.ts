import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { Fetch } from '@/services/Request'
import { berlinToday } from '@/services/breakfast'
import { logger } from '@/lib/logger'

/**
 * The three numbers an owner wants first thing: who arrives today, who leaves,
 * who sleeps here tonight. Admin only — it is a sweep of the day's
 * reservations, not something to hand to anybody who asks.
 *
 * No `status` filter on the wire. Apaleo honours only the first of a repeated
 * `status=` and drops the rest without a word (see amendStayTime.ts for the
 * room that was sold twice because of it), so the cancelled and no-show
 * reservations are dropped here, where the rule is visible.
 *
 * A count that could not be read comes back as `null`, not 0: a dashboard that
 * says "0 arrivals" when Apaleo was unreachable is worse than one that says
 * it does not know.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Page {
  reservations?: { status?: string }[]
}

const PAGE = 100
// A full house is 125 rooms; three pages is already more than a day can hold.
const MAX_PAGES = 3

async function countLive(
  dateFilter: 'Arrival' | 'Departure' | 'Stay',
  from: string,
  to: string,
): Promise<number | null> {
  let n = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      propertyIds: process.env.APALEO_PROPERTY_ID || 'CMH',
      dateFilter,
      from,
      to,
      pageNumber: String(page),
      pageSize: String(PAGE),
    })
    let res: Page | null = null
    try {
      res = await Fetch<Page>(`/booking/v1/reservations?${params}`)
    } catch (e) {
      logger.error('admin/today: reservation page failed', {
        dateFilter,
        page,
        error: e instanceof Error ? e.message : String(e),
      })
      return null
    }
    const items = Array.isArray(res?.reservations) ? res.reservations : []
    for (const r of items) {
      const status = String(r?.status ?? '')
      if (status === 'Canceled' || status === 'NoShow') continue
      n++
    }
    if (items.length < PAGE) break
  }
  return n
}

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const day = berlinToday()
  const dayStart = `${day}T00:00:00Z`
  const dayEnd = `${day}T23:59:59Z`
  // "Tonight" is the late evening: a stay that overlaps it has neither left
  // this morning nor failed to arrive yet.
  const nightStart = `${day}T20:00:00Z`

  const [arrivals, departures, staying] = await Promise.all([
    countLive('Arrival', dayStart, dayEnd),
    countLive('Departure', dayStart, dayEnd),
    countLive('Stay', nightStart, dayEnd),
  ])

  return NextResponse.json(
    { ok: true, date: day, arrivals, departures, staying },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
