import { unstable_cache } from 'next/cache'
import dayjs from 'dayjs'
import { Fetch } from '@/services/Request'
import { getPrices } from '@/app/actions/apaleo/rooms/getPrices'
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
 * One availability call covers all unit groups for the whole window; prices are
 * then fetched once per distinct nearest date (rooms usually cluster on the
 * same first free night). Wrapped in unstable_cache (10 min) so a busy landing
 * page does not hammer Apaleo — the home route is force-dynamic.
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

  // Earliest night with availableCount > 0 per unit group (timeSlices are
  // chronological, so the first hit per group is the nearest).
  const nearestByGroup = new Map<string, string>()
  for (const slice of avail.timeSlices ?? []) {
    const date = typeof slice.from === 'string' ? slice.from.slice(0, 10) : null
    if (!date) continue
    for (const g of slice.unitGroups ?? []) {
      const id = g.unitGroup?.id
      if (!id || nearestByGroup.has(id)) continue
      if ((g.availableCount ?? 0) > 0) nearestByGroup.set(id, date)
    }
  }
  if (nearestByGroup.size === 0) return []

  // Group the room types by their nearest date so each date is priced once.
  const groupsByDate = new Map<string, string[]>()
  for (const [groupId, date] of nearestByGroup) {
    if (!groupsByDate.has(date)) groupsByDate.set(date, [])
    groupsByDate.get(date)!.push(groupId)
  }

  // Price every distinct nearest date in parallel (independent offer calls).
  const priced = await Promise.all(
    [...groupsByDate.keys()].map(async (date) => {
      const departure = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
      const prices = await getPrices(date, departure, 1)
      return { date, departure, prices }
    }),
  )

  const result: NearestAvailableRoom[] = []
  for (const { date, departure, prices } of priced) {
    for (const groupId of groupsByDate.get(date) ?? []) {
      // A room has FREE units at its nearest night. Attach the price when
      // Apaleo has a published offer for that night; leave it 0 otherwise (a
      // room type can have availability but no rate plan on the channel).
      const minNightPrice = prices.find((p) => p.roomId === groupId)?.minNightPrice ?? 0
      result.push({ roomId: groupId, arrival: date, departure, oneNightPrice: minNightPrice })
    }
  }

  // On the real production site (charlie-m.de) show ONLY rooms that are
  // actually bookable — i.e. Apaleo published a price/rate plan — so a card
  // never leads to a dead end and unpublished/test room types are hidden
  // automatically. On Vercel previews and local dev, show every free room
  // (price appears once published) so the feed can be checked end-to-end while
  // rates are still being set up. (VERCEL_ENV is 'production' only on the
  // production deployment; 'preview' on branch previews; undefined locally.)
  if (process.env.VERCEL_ENV === 'production') {
    return result.filter((r) => r.oneNightPrice > 0)
  }
  return result
}

export const getNearestAvailableRooms = unstable_cache(
  fetchNearestAvailableRooms,
  ['nearest-available-rooms'],
  { revalidate: 600, tags: ['rooms'] },
)
