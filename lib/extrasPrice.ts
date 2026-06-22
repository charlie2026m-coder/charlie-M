import type { Service } from '@/types/apaleo'
import type { AddExtrasService } from '@/store/useAddExtras'

export interface ExtrasPriceContext {
  nights: number
}

export interface ExtrasPriceLine {
  serviceId: string
  catalogPriceCents: number
  units: number
  subtotalCents: number
}

export interface ExtrasPriceResult {
  totalCents: number
  breakdown: ExtrasPriceLine[]
}

export class UnknownServiceError extends Error {
  constructor(public readonly serviceId: string) {
    super(`service ${serviceId} not in Apaleo catalog`)
    this.name = 'UnknownServiceError'
  }
}

// Single source of truth for "is this a cleaning service".
// CMH-ADCLN is the canonical CharlieM code; the name-substring branch catches
// a future second cleaning SKU before the UI and server diverge on it.
export function isCleaningService(
  serviceId: string,
  catalogName?: string,
): boolean {
  if (serviceId === 'CMH-ADCLN') return true
  return catalogName?.toLowerCase().includes('clean') ?? false
}

// Baby bed (CMH-BAB) is priced per night regardless of `count` — UI and
// validator both treat it as `nights` units. Kept as a named predicate so
// pricing and the Apaleo payload builder classify it identically.
export function isBabyBedService(serviceId: string): boolean {
  return serviceId === 'CMH-BAB'
}

// Late Check-Out (CMH-LCO) and Early Check-In (CMH-ECI) are NOT booked as
// folio services. Apaleo's "Departure"/"Arrival" mode services bind to the
// last/first night and can't be added once that night has passed (the guest
// deciding on departure morning) — the old book-service flow charged then
// refunded. Instead these are applied as a reservation AMEND (change the
// checkout/checkin TIME) plus a folio fee line. This predicate routes them to
// that path. Returns 'late' for LCO, 'early' for ECI, null otherwise.
export function isStayExtensionService(serviceId: string): 'late' | 'early' | null {
  if (serviceId === 'CMH-LCO') return 'late'
  if (serviceId === 'CMH-ECI') return 'early'
  return null
}

// A daily Person/Room service is charged `count × nights`, so it must be
// booked on every night. Shared between the price computation and the Apaleo
// payload builder so "how many units" can never diverge from "what we book".
export function isDailyMultiplied(cat: Service): boolean {
  const isDaily = cat.pricingType === 'Daily'
  const isPersonOrRoom = cat.pricingUnit === 'Person' || cat.pricingUnit === 'Room'
  return isDaily && isPersonOrRoom
}

export function computeServicesTotalCents(
  services: readonly AddExtrasService[],
  catalog: readonly Service[],
  ctx: ExtrasPriceContext,
  existingCleaningDates: ReadonlySet<string> = new Set(),
): ExtrasPriceResult {
  let totalCents = 0
  const breakdown: ExtrasPriceLine[] = []

  for (const service of services) {
    const cat = catalog.find(c => c.id === service.serviceId)
    if (!cat) {
      throw new UnknownServiceError(service.serviceId)
    }

    const catalogPriceCents = Math.round(cat.price * 100)
    const isCleaning = isCleaningService(service.serviceId, cat.name)

    let units = 0

    if (isStayExtensionService(service.serviceId)) {
      // LCO/ECI = a single reservation amend (one time change), never per-person
      // or per-night, regardless of `count`/`dates` or the catalog pricingUnit.
      // Pinned to 1 so the validated total, folio fee, and UI always agree.
      units = 1
    } else if (isBabyBedService(service.serviceId)) {
      // UI sums baby bed as price × nights regardless of `count`. Mirrored
      // so the server doesn't reject the same total the UI displays. If/when
      // the UI starts respecting count, update both call sites together.
      units = ctx.nights
    } else if (service.count != null) {
      units = isDailyMultiplied(cat)
        ? service.count * ctx.nights
        : service.count
    } else if (service.dates?.length) {
      const eligible = isCleaning
        ? service.dates.filter(d => !existingCleaningDates.has(d.serviceDate))
        : service.dates
      units = eligible.reduce((sum, d) => sum + (d.count ?? 1), 0)
    }

    const subtotalCents = catalogPriceCents * units
    totalCents += subtotalCents
    breakdown.push({
      serviceId: service.serviceId,
      catalogPriceCents,
      units,
      subtotalCents,
    })
  }

  return { totalCents, breakdown }
}

// Apaleo PUT /reservation-actions/{id}/book-service payload. Mirrors the shape
// the working AddLimitedExtra flow already sends (per-date count + amount).
export interface ApaleoServiceDate {
  serviceDate: string
  count?: number
  amount?: { amount: number; currency: string }
}
export interface ApaleoBookServicePayload {
  serviceId: string
  count?: number
  dates?: ApaleoServiceDate[]
  // Stay-extension (LCO/ECI) ONLY: the fee to post as a folio charge alongside
  // the reservation amend. Never sent to the book-service endpoint (those
  // payloads route to the amend flow), so it can't reach a regular service.
  amount?: { amount: number; currency: string }
}

export interface BuildPayloadContext {
  // Consecutive night dates (YYYY-MM-DD), arrival .. departure-1. Length must
  // equal the `nights` used by computeServicesTotalCents so the booked unit
  // count matches the charged amount exactly.
  nightDates: readonly string[]
}

// Builds the Apaleo book-service payloads from the same store services the
// price was computed from. Daily-multiplied services and baby bed are expanded
// to one date entry per night (so the folio gets count×nights units, matching
// the charge); services that already carry `dates[]` and one-time `count`
// services pass through unchanged. Keeping this in lockstep with
// computeServicesTotalCents (same predicates) is what prevents "charged ≠
// booked" desync.
export function buildApaleoServicePayloads(
  services: readonly AddExtrasService[],
  catalog: readonly Service[],
  ctx: BuildPayloadContext,
  existingCleaningDates: ReadonlySet<string> = new Set(),
): ApaleoBookServicePayload[] {
  return services.flatMap((service): ApaleoBookServicePayload[] => {
    const cat = catalog.find(c => c.id === service.serviceId)
    if (!cat) {
      throw new UnknownServiceError(service.serviceId)
    }

    const currency = cat.currency || 'EUR'
    const isCleaning = isCleaningService(service.serviceId, cat.name)

    // Stay extension (LCO/ECI): not a folio service — booked via reservation
    // amend. One reservation amend = one fee, pinned to count 1 (matching
    // computeServicesTotalCents) so the posted folio charge always equals the
    // validated subtotal regardless of count/dates/guest count.
    if (isStayExtensionService(service.serviceId)) {
      return [{
        serviceId: service.serviceId,
        count: 1,
        amount: { amount: cat.price, currency },
      }]
    }

    // Already per-date (cleaning / limited). For cleaning, drop dates already
    // on the Apaleo folio — the validator excludes them from the charge (using
    // the same Apaleo-derived set, NOT the client `isExisting` flag), so
    // re-booking them would put more on the folio than the guest paid for. If
    // nothing new remains, omit the service entirely.
    if (service.dates?.length) {
      const eligible = isCleaning
        ? service.dates.filter(d => !existingCleaningDates.has(d.serviceDate))
        : service.dates
      if (eligible.length === 0) return []
      return [{
        serviceId: service.serviceId,
        dates: eligible.map(d => ({
          serviceDate: d.serviceDate,
          count: d.count,
          // Use the catalog price for the folio line (same as the baby-bed and
          // daily branches) — never the client-supplied d.amount, which could
          // be tampered to write a wrong amount onto the hotel's folio.
          amount: { amount: cat.price * (d.count ?? 1), currency },
        })),
      }]
    }

    // Baby bed: one bed per night across the whole stay.
    if (isBabyBedService(service.serviceId)) {
      return [{
        serviceId: service.serviceId,
        dates: ctx.nightDates.map(serviceDate => ({
          serviceDate,
          count: 1,
          amount: { amount: cat.price, currency },
        })),
      }]
    }

    // Daily Person/Room with a count: book the count on every night.
    if (service.count != null && isDailyMultiplied(cat)) {
      const count = service.count
      return [{
        serviceId: service.serviceId,
        dates: ctx.nightDates.map(serviceDate => ({
          serviceDate,
          count,
          amount: { amount: cat.price * count, currency },
        })),
      }]
    }

    // One-time count service (not daily) — booked once at the given count.
    if (service.count != null) {
      return [{ serviceId: service.serviceId, count: service.count }]
    }

    // No count, no dates, not baby bed — book once.
    return [{ serviceId: service.serviceId }]
  })
}
