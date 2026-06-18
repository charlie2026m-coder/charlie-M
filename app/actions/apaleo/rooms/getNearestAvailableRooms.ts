import { unstable_cache } from 'next/cache'
import dayjs from 'dayjs'
import { Fetch } from '@/services/Request'
import { getPrices, type RoomPrice } from '@/app/actions/apaleo/rooms/getPrices'
import { getMinArrivalDate } from '@/lib/utils'

const propId = process.env.APALEO_PROPERTY_ID

// How far ahead to scan for the nearest bookable night per room type.
const SEARCH_WINDOW_DAYS = 60

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

  // For each room type: the nearest probed night that has a real bookable price
  // (> 0), skipping priceless-but-free nights. Rooms with no priced night in the
  // probe window get their nearest free night at price 0 as a dev/preview-only
  // fallback (see the env branch below).
  const priced: NearestAvailableRoom[] = []
  const unpriced: NearestAvailableRoom[] = []
  for (const [groupId, nights] of availableNightsByGroup) {
    let pricedNight: NearestAvailableRoom | null = null
    for (const date of nights) {
      const prices = pricesByDate.get(date)
      if (!prices) continue // defensive — every free night is probed above
      const minNightPrice = prices.find((p) => p.roomId === groupId)?.minNightPrice ?? 0
      if (minNightPrice > 0) {
        pricedNight = {
          roomId: groupId,
          arrival: date,
          departure: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
          oneNightPrice: minNightPrice,
        }
        break // nearest priced night for this room type
      }
    }
    if (pricedNight) {
      priced.push(pricedNight)
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

  // Order the carousel by how soon each card is bookable (its shown arrival),
  // not by Apaleo's room-type response order.
  priced.sort((a, b) => a.arrival.localeCompare(b.arrival))

  // On the real production site (charlie-m.de) show ONLY rooms that are
  // actually bookable — i.e. a published 1-night price exists — so a card never
  // leads to a dead end and unpublished/test room types are hidden
  // automatically. On Vercel previews and local dev, also surface free rooms
  // that have no priced night yet (at price 0) so the feed can be checked
  // end-to-end while rates are still being set up. (VERCEL_ENV is 'production'
  // only on the production deployment; 'preview' on branch previews; undefined
  // locally.)
  if (process.env.VERCEL_ENV === 'production') {
    return priced
  }
  // Dev/preview: interleave the unpriced (price-0) rooms by nearest date too, so
  // a free-soon-but-unpriced room shows near the front during pre-launch checks
  // rather than being pushed to the end.
  return [...priced, ...unpriced].sort((a, b) => a.arrival.localeCompare(b.arrival))
}

export const getNearestAvailableRooms = unstable_cache(
  fetchNearestAvailableRooms,
  ['nearest-available-rooms'],
  { revalidate: 600, tags: ['rooms'] },
)
