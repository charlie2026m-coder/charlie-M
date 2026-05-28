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
    const isBabyBed = service.serviceId === 'CMH-BAB'
    const isCleaning = isCleaningService(service.serviceId, cat.name)

    let units = 0

    if (isBabyBed) {
      // UI sums baby bed as price × nights regardless of `count`. Mirrored
      // so the server doesn't reject the same total the UI displays. If/when
      // the UI starts respecting count, update both call sites together.
      units = ctx.nights
    } else if (service.count != null) {
      const isDaily = cat.pricingType === 'Daily'
      const isPersonOrRoom =
        cat.pricingUnit === 'Person' || cat.pricingUnit === 'Room'
      units = isDaily && isPersonOrRoom
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
