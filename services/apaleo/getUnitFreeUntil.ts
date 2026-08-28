import { Fetch } from '@/services/Request'
import { logger } from '@/lib/logger'

const log = logger.withTag('unit-window')

/** How far ahead to look for the next booking on the unit. */
const HORIZON_DAYS = 120

interface ReservationsResponse {
  reservations?: {
    id: string
    status?: string
    arrival?: string
    unit?: { id?: string }
  }[]
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * The latest checkout date a guest can extend to while staying in THEIR unit.
 *
 * An extension is only offered for the guest's own studio: if they have to
 * move, the room needs a full turnover anyway. So the limit is simply "when
 * does someone else move into it", which one reservations call answers exactly
 * — no probing offers length by length, and no window past which the answer
 * quietly becomes a guess.
 *
 * Returns the day the unit is next taken (a valid checkout, since a checkout
 * and the next arrival share a date), or `from` itself when it is taken right
 * away — meaning no extension is possible at all.
 *
 * Fails CLOSED: without proof the unit is free we promise nothing.
 */
export async function getUnitFreeUntil(unitId: string, from: string): Promise<string> {
  if (!unitId || !from) return from

  const params = new URLSearchParams({
    propertyIds: process.env.APALEO_PROPERTY_ID ?? '',
    from: `${from}T00:00:00Z`,
    to: `${addDays(from, HORIZON_DAYS)}T00:00:00Z`,
    dateFilter: 'Stay',
    pageSize: '100',
    expand: 'unit',
  })

  try {
    const res = await Fetch<ReservationsResponse>(`/booking/v1/reservations?${params.toString()}`)
    const arrivals = (res.reservations ?? [])
      .filter(r => r.unit?.id === unitId && !['Canceled', 'NoShow'].includes(r.status ?? ''))
      .map(r => (r.arrival ?? '').slice(0, 10))
      .filter(a => a >= from)
      .sort()

    return arrivals[0] ?? addDays(from, HORIZON_DAYS)
  } catch (err) {
    log.warn('unit window lookup failed — offering no extension', {
      unitId,
      from,
      error: err instanceof Error ? err.message : String(err),
    })
    return from
  }
}
