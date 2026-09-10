import { Fetch } from '@/services/Request'
import { logger } from '@/lib/logger'

const log = logger.withTag('unit-availability')

interface ReservationsResponse {
  count?: number
  reservations?: Array<{
    id: string
    status?: string
    arrival?: string
    departure?: string
    unit?: { id?: string }
  }>
}

const PAGE_SIZE = 100

export interface UnitOccupancy {
  /** Nights (YYYY-MM-DD) somebody else is in this unit. */
  occupied: string[]
  /** False when the window could not be read in full — the caller must not
   *  present the gaps as "free". */
  complete: boolean
}

/**
 * Which nights is this unit taken, over [from, to)?
 *
 * The per-night twin of `isUnitFree`, for painting a calendar rather than
 * answering one yes/no. Same two rules, for the same reasons:
 *
 *   - `unitIds` filters server-side. Pulling the property and filtering here
 *     overflowed the 100-row page on a busy window (176 rows over 48 days,
 *     measured), which silently dropped occupants.
 *   - `excludeReservationId` skips the booking being moved. It still sits on
 *     this unit on its OLD dates, so without the exclusion a guest shortening
 *     or shifting their stay is told their own room is taken by themselves.
 *
 * Cancelled and no-show reservations keep their unit assignment in Apaleo but
 * do not occupy it.
 *
 * The departure night is NOT occupied: a stay 10th->13th holds 10, 11, 12 and
 * frees the room on the 13th.
 */
export async function getUnitOccupiedNights(
  unitId: string,
  from: string,
  to: string,
  excludeReservationId?: string,
): Promise<UnitOccupancy> {
  if (!unitId) return { occupied: [], complete: false }

  const params = new URLSearchParams({
    propertyIds: process.env.APALEO_PROPERTY_ID ?? '',
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
    const complete = !(typeof res.count === 'number' && res.count > rows.length)
    if (!complete) {
      log.warn('unit occupancy: response truncated', {
        unitId,
        from,
        to,
        count: res.count,
        returned: rows.length,
      })
    }

    const occupied = new Set<string>()
    for (const r of rows) {
      if (r.unit?.id !== unitId) continue
      if (r.id === excludeReservationId) continue
      if (['Canceled', 'NoShow'].includes(r.status ?? '')) continue
      const start = r.arrival?.slice(0, 10)
      const end = r.departure?.slice(0, 10)
      if (!start || !end) continue
      for (const d = new Date(`${start}T00:00:00Z`); d < new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
        occupied.add(d.toISOString().slice(0, 10))
      }
    }
    return { occupied: [...occupied].sort(), complete }
  } catch (err) {
    log.warn('unit occupancy check failed', {
      unitId,
      from,
      to,
      error: err instanceof Error ? err.message : String(err),
    })
    return { occupied: [], complete: false }
  }
}
