import { Fetch } from '@/services/Request'
import { logger } from '@/lib/logger'

const log = logger.withTag('unit-availability')

interface ReservationsResponse {
  count?: number
  reservations?: {
    id: string
    status?: string
    unit?: { id?: string }
  }[]
}

const PAGE_SIZE = 100

/**
 * Is this exact unit free for [from, to)?
 *
 * A stay extension is only worth the discounted extension rate when the guest
 * stays put: if they have to move, the room needs a full turnover anyway and
 * the whole point of the cheaper rate disappears. So the extension flow asks
 * about the guest's OWN unit, not "is anything in this category free".
 *
 * `dateFilter=Stay` returns everything overlapping the window; a unit is free
 * when no live reservation in that window sits on it. Cancelled and no-show
 * reservations keep their unit assignment in Apaleo but do not occupy it.
 *
 * `excludeReservationId` is required whenever the window can overlap the asking
 * reservation's OWN stay. Extension windows start at the current departure so
 * they never do — but a date change does, and without the exclusion the
 * reservation being moved reads as the thing blocking its own move (verified
 * live: shifting a booking by one day returned that same booking).
 *
 * Fails CLOSED (returns false): if we cannot prove the unit is free we must not
 * promise the guest their own room. That includes a truncated page — the
 * `unitIds` filter makes overflow practically impossible, but a silently
 * dropped reservation would read as "free" and double-book a paid studio.
 */
export async function isUnitFree(
  unitId: string,
  from: string,
  to: string,
  excludeReservationId?: string,
): Promise<boolean> {
  if (!unitId) return false

  const propertyId = process.env.APALEO_PROPERTY_ID
  const params = new URLSearchParams({
    propertyIds: propertyId ?? '',
    // Ask about the one unit rather than pulling the whole property and
    // filtering client-side: on a full house a wide window exceeded the 100-row
    // page (176 rows over 48 days, measured), and the occupant could fall off
    // the end of it.
    unitIds: unitId,
    from: `${from}T00:00:00Z`,
    to: `${to}T00:00:00Z`,
    dateFilter: 'Stay',
    pageSize: String(PAGE_SIZE),
    expand: 'unit',
  })

  try {
    const res = await Fetch<ReservationsResponse>(`/booking/v1/reservations?${params.toString()}`)
    const rows = res.reservations ?? []

    if (typeof res.count === 'number' && res.count > rows.length) {
      log.warn('unit availability: response truncated — treating as occupied', {
        unitId,
        from,
        to,
        count: res.count,
        returned: rows.length,
      })
      return false
    }

    const occupied = rows.some(r =>
      r.unit?.id === unitId &&
      r.id !== excludeReservationId &&
      !['Canceled', 'NoShow'].includes(r.status ?? ''),
    )
    return !occupied
  } catch (err) {
    log.warn('unit availability check failed — treating as occupied', {
      unitId,
      from,
      to,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
