import { Fetch } from '@/services/Request'
import { apaleoLog } from '@/lib/logger'

/**
 * How many early check-ins / late checkouts may still be sold for a day — by
 * Apaleo's own rule, enforced by us.
 *
 * The hotel sets the limit in Apaleo: Services → the ECI/LCO service →
 * Availability → quantity ("Quota/Limit for service", per Apaleo's API docs).
 * Apaleo enforces it for service BOOKINGS. Our sale is not one: it is a
 * reservation amend plus a folio line (see amendStayTime.ts — a
 * departure-mode service cannot be booked on the departure morning), so
 * Apaleo's counter never saw a single sale of ours. Measured on 2026-09-14 at
 * Motz19: quota 1 late checkout, 2 sold — one through Apaleo, one through us.
 *
 * This reads Apaleo's counter for the day and adds what we sold ourselves:
 * reservations of that day carrying our fee line on the folio but NOT the
 * Apaleo service (those are already in Apaleo's count).
 *
 * The day Apaleo books the quota against is the arrival day for an early
 * check-in but the LAST NIGHT — departure minus one — for a late checkout
 * (verified live: a 14.09 departure with the service showed as sold on
 * serviceDate 13.09). Our own count is by the guest's actual arrival /
 * departure day; the two describe the same guests.
 *
 * `null` means "nothing to enforce": no quota configured, or the numbers
 * could not be read. A limit on how many to SELL is a business rule, not a
 * safety one — an unreadable counter must not stop trade, so it is said in
 * the log and the sale goes on.
 */
export interface StayExtensionQuota {
  serviceId: string
  /** The day Apaleo books the quota against (see above). */
  serviceDate: string
  quota: number
  soldByApaleo: number
  soldByUs: number
  remaining: number
}

const propId = process.env.APALEO_PROPERTY_ID

/** The folio line each purchase path posts — the only trace of a sale of ours. */
const FEE_NAME = { early: 'Early Check-In', late: 'Late Check-Out' } as const

function plusDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10)
}

export async function stayExtensionQuota(
  kind: 'late' | 'early',
  serviceId: string,
  stay: { arrival: string; departure: string },
  opts: { excludeReservationId?: string } = {},
): Promise<StayExtensionQuota | null> {
  if (!propId || !serviceId) return null
  try {
    const day = (kind === 'early' ? stay.arrival : stay.departure).slice(0, 10)
    const serviceDate = kind === 'early' ? day : plusDays(day, -1)

    const avail = await Fetch<{
      timeSlices?: Array<{
        services?: Array<{
          service?: { id?: string }
          serviceDate?: string
          quantity?: number | null
          soldCount?: number
          availableCount?: number
        }>
      }>
    }>(`/availability/v1/services?propertyId=${propId}&from=${serviceDate}&to=${plusDays(serviceDate, 1)}`)
    const row = (avail?.timeSlices ?? [])
      .flatMap((ts) => ts.services ?? [])
      .find((s) => s.service?.id === serviceId && s.serviceDate === serviceDate)
    if (!row || row.quantity === null || row.quantity === undefined) return null

    // Our own sales for that day, invisible to Apaleo's counter.
    const list = await Fetch<{
      reservations?: Array<{
        id: string
        status?: string
        services?: Array<{ service?: { id?: string }; serviceId?: string }>
      }>
    }>(
      `/booking/v1/reservations?propertyIds=${propId}&dateFilter=${kind === 'early' ? 'Arrival' : 'Departure'}` +
        `&from=${day}T00:00:00Z&to=${day}T23:59:59Z&expand=services&pageSize=500`,
    )
    const rows = (list?.reservations ?? []).filter(
      (r) => r.id !== opts.excludeReservationId && r.status !== 'Canceled' && r.status !== 'NoShow',
    )
    const viaService = new Set(
      rows
        .filter((r) => (r.services ?? []).some((s) => (s.service?.id ?? s.serviceId) === serviceId))
        .map((r) => r.id),
    )
    let soldByUs = 0
    if (rows.length > 0) {
      const folios = await Fetch<{
        folios?: Array<{ reservation?: { id?: string }; charges?: Array<{ name?: string }> }>
      }>(
        `/finance/v1/folios?reservationIds=${rows.map((r) => encodeURIComponent(r.id)).join(',')}` +
          `&expand=charges&pageSize=500`,
      )
      const withFee = new Set<string>()
      for (const f of folios?.folios ?? []) {
        const id = f.reservation?.id
        if (id && (f.charges ?? []).some((c) => c.name === FEE_NAME[kind])) withFee.add(id)
      }
      for (const id of withFee) if (!viaService.has(id)) soldByUs += 1
    }

    const soldByApaleo = row.soldCount ?? 0
    const availableByApaleo = row.availableCount ?? Math.max(0, row.quantity - soldByApaleo)
    return { serviceId, serviceDate, quota: row.quantity, soldByApaleo, soldByUs, remaining: availableByApaleo - soldByUs }
  } catch (err) {
    apaleoLog.error('stay-extension quota: could not be read — allowing the sale', {
      serviceId,
      kind,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
