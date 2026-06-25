import { unstable_cache } from 'next/cache'
import dayjs from 'dayjs'
import { Fetch } from '@/services/Request'
import { getPrices, type RoomPrice } from '@/app/actions/apaleo/rooms/getPrices'
import { getMinArrivalDate } from '@/lib/utils'

const propId = process.env.APALEO_PROPERTY_ID

// How far ahead to scan for the nearest bookable night per room type.
const SEARCH_WINDOW_DAYS = 60

// The showcase shows each studio at its nearest bookable night, then — as the
// visitor scrolls — the SAME studio at its next available nights. Cap how many
// date-windows per studio and how far apart they must be so scrolling reveals
// genuinely different dates instead of the same night repeated.
const WINDOWS_PER_TYPE = 3
const NEXT_WINDOW_GAP_DAYS = 7

interface UnitGroupAvailabilityResponse {
  timeSlices?: Array<{
    from?: string
    unitGroups?: Array<{
      unitGroup?: { id?: string }
      availableCount?: number
    }>
  }>
}

export interface NearestAvailableRoom {
  roomId: string // Apaleo unit group id (= Supabase rooms.id)
  arrival: string // YYYY-MM-DD — nearest night with availability
  departure: string // YYYY-MM-DD — arrival + 1
  oneNightPrice: number // gross incl. city tax, 1 guest
}

/**
 * Powers the landing-page "Choose Room" showcase. For every room type it finds
 * the NEAREST night from today that has availability and a bookable 1-night
 * offer, so the feed shows one card per room with a real soon date + price
 * instead of only the rooms free for the auto-seeded today→tomorrow range.
 *
 * One availability call covers all unit groups for the whole window; every
 * distinct free-night date is then priced through a small worker pool (one
 * offer call per date covers every room type, and the 60-day window bounds the
 * distinct dates). Wrapped in unstable_cache (10 min) so a busy landing page
 * does not hammer Apaleo — the home route is force-dynamic.
 */
export async function fetchNearestAvailableRooms(): Promise<NearestAvailableRoom[]> {
  if (!propId) return []

  const fromDate = getMinArrivalDate()
  const from = dayjs(fromDate).format('YYYY-MM-DD')
  const to = dayjs(fromDate).add(SEARCH_WINDOW_DAYS, 'day').format('YYYY-MM-DD')

  let avail: UnitGroupAvailabilityResponse
  try {
    avail = await Fetch<UnitGroupAvailabilityResponse>(
      `/availability/v1/unit-groups?propertyId=${propId}&from=${from}&to=${to}`,
    )
  } catch (error) {
    console.error(
      'getNearestAvailableRooms availability error:',
      error instanceof Error ? error.message : 'unknown',
    )
    return []
  }

  // All nights with availableCount > 0 per unit group, in chronological order
  // (timeSlices are already chronological).
  const availableNightsByGroup = new Map<string, string[]>()
  for (const slice of avail.timeSlices ?? []) {
    const date = typeof slice.from === 'string' ? slice.from.slice(0, 10) : null
    if (!date) continue
    for (const g of slice.unitGroups ?? []) {
      const id = g.unitGroup?.id
      if (!id) continue
      if ((g.availableCount ?? 0) > 0) {
        const list = availableNightsByGroup.get(id)
        if (list) list.push(date)
        else availableNightsByGroup.set(id, [date])
      }
    }
  }
  if (availableNightsByGroup.size === 0) return []

  // Defensive: keep each group's nights strictly chronological so the walk below
  // picks the genuinely EARLIEST priced night even if Apaleo ever returns
  // timeSlices out of order (ISO YYYY-MM-DD sorts chronologically).
  for (const nights of availableNightsByGroup.values()) nights.sort()

  // A night can have FREE units yet return NO 1-night offer — the rate plan is
  // not published for it, or a rate restriction applies (e.g. a minimum stay:
  // you can arrive but not book a single night). Such a card would show no price
  // and dead-end on Book Now, so we SKIP those nights and use each room type's
  // nearest night that actually prices. The 60-day window bounds the distinct
  // free-night dates to ~60, so we price EVERY one of them (one offer call per
  // date covers all room types) rather than capping per room — any cap could
  // drop a genuinely-bookable room whose only priced night is late, which is the
  // exact bug this whole path exists to avoid.
  const probeDates = [...new Set([...availableNightsByGroup.values()].flat())].sort()

  // getPrices swallows transient Apaleo errors and returns [] — indistinguishable
  // from a legitimately price-less night. With throwOnError we can tell them
  // apart and retry once, so a brief 429/5xx blip does not silently mis-date or
  // drop a room (the result is cached 10 min, so a degraded read would stick).
  const probeDate = async (date: string): Promise<RoomPrice[]> => {
    const departure = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
    try {
      return await getPrices(date, departure, 1, { throwOnError: true })
    } catch {
      try {
        return await getPrices(date, departure, 1, { throwOnError: true })
      } catch {
        console.error(`getNearestAvailableRooms: price probe failed for ${date} after retry`)
        return []
      }
    }
  }

  // Bounded-concurrency worker pool: at most PROBE_CONCURRENCY offer calls run at
  // once, so a cold cache never bursts dozens of simultaneous calls at Apaleo
  // (total calls are still one per distinct date, bounded by the window).
  const pricesByDate = new Map<string, RoomPrice[]>()
  const PROBE_CONCURRENCY = 6
  let cursor = 0
  const worker = async () => {
    while (cursor < probeDates.length) {
      const date = probeDates[cursor++]
      pricesByDate.set(date, await probeDate(date))
    }
  }
  await Promise.all(Array.from({ length: Math.min(PROBE_CONCURRENCY, probeDates.length) }, worker))

  // This room type's bookable 1-night price on a probed date (0 = not bookable:
  // priceless free night, rate plan unpublished, or a min-stay restriction).
  const priceFor = (groupId: string, date: string) =>
    pricesByDate.get(date)?.find((p) => p.roomId === groupId)?.minNightPrice ?? 0

  // For each room type build up to WINDOWS_PER_TYPE date-windows: its NEAREST
  // priced night, then the next priced night at least NEXT_WINDOW_GAP_DAYS later,
  // and so on — skipping priceless-but-free nights so a card never dead-ends on
  // Book Now. Rooms with no priced night get a single price-0 fallback card
  // (dev/preview only, see the env branch below).
  const windowsByGroup = new Map<string, NearestAvailableRoom[]>()
  const unpriced: NearestAvailableRoom[] = []
  let maxWindows = 0
  for (const [groupId, nights] of availableNightsByGroup) {
    const windows: NearestAvailableRoom[] = []
    let prevDate: string | null = null
    for (const date of nights) {
      if (windows.length >= WINDOWS_PER_TYPE) break
      // Enforce the minimum gap from the previous window so scrolling reveals
      // genuinely different dates, not the same week repeated.
      if (
        prevDate &&
        date < dayjs(prevDate).add(NEXT_WINDOW_GAP_DAYS, 'day').format('YYYY-MM-DD')
      ) {
        continue
      }
      const price = priceFor(groupId, date)
      if (price <= 0) continue // skip priceless / min-stay nights
      windows.push({
        roomId: groupId,
        arrival: date,
        departure: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
        oneNightPrice: price,
      })
      prevDate = date
    }
    if (windows.length) {
      windowsByGroup.set(groupId, windows)
      if (windows.length > maxWindows) maxWindows = windows.length
    } else {
      const firstNight = nights[0]
      unpriced.push({
        roomId: groupId,
        arrival: firstNight,
        departure: dayjs(firstNight).add(1, 'day').format('YYYY-MM-DD'),
        oneNightPrice: 0,
      })
    }
  }

  // Order studios by their nearest (window-1) date so the opening screen stays
  // sorted by soonest, then interleave round-robin by window rank: every studio's
  // nearest date first, then every studio's 2nd date, etc. So the first cards are
  // one-per-studio at the soonest date (unchanged) and scrolling walks the SAME
  // studios forward in time instead of looping the identical few.
  const orderedGroups = [...windowsByGroup.values()].sort((a, b) =>
    a[0].arrival.localeCompare(b[0].arrival),
  )
  const priced: NearestAvailableRoom[] = []
  for (let rank = 0; rank < maxWindows; rank++) {
    for (const windows of orderedGroups) {
      if (windows[rank]) priced.push(windows[rank])
    }
  }

  // On the real production site (charlie-m.de) show ONLY rooms that are actually
  // bookable — a published 1-night price exists — so a card never leads to a dead
  // end and unpublished/test room types are hidden automatically. On Vercel
  // previews and local dev, also surface free rooms with no priced night yet (at
  // price 0) so the feed can be checked end-to-end while rates are still being set
  // up. (VERCEL_ENV is 'production' only on the production deployment.)
  if (process.env.VERCEL_ENV === 'production') {
    return priced
  }
  // Dev/preview: interleave the unpriced (price-0) rooms by nearest date too.
  return [...priced, ...unpriced].sort((a, b) => a.arrival.localeCompare(b.arrival))
}

export const getNearestAvailableRooms = unstable_cache(
  fetchNearestAvailableRooms,
  ['nearest-available-rooms'],
  { revalidate: 600, tags: ['rooms'] },
)
