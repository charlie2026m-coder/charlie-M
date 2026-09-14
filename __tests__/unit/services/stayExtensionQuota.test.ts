import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Apaleo's quota for early check-ins / late checkouts, enforced by us.
 *
 * The hotel sets "quantity" on the service in Apaleo and believed the limit
 * was live. It was not: Apaleo counts service bookings, and our sale is an
 * amend plus a folio line. Motz19, 2026-09-14 — quota 1 late checkout, two
 * sold. This helper reads Apaleo's counter and adds our own sales; the
 * validators refuse at zero, before any card is charged.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({ Fetch: (...a: unknown[]) => fetchMock(...a) }))
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ apaleoLog: log }))

process.env.APALEO_PROPERTY_ID = 'MOT'

const { stayExtensionQuota } = await import('@/services/apaleo/stayExtensionQuota')

const stay = { arrival: '2026-09-10T15:00:00+02:00', departure: '2026-09-14T11:00:00+02:00' }

/** Apaleo as the helper sees it, routed by endpoint. */
function apaleo(world: { availability?: unknown; reservations?: unknown[]; folios?: unknown[] }) {
  fetchMock.mockImplementation((url: string) => {
    const u = String(url)
    if (u.includes('/availability/v1/services')) return Promise.resolve(world.availability ?? { timeSlices: [] })
    if (u.includes('/finance/v1/folios')) return Promise.resolve({ folios: world.folios ?? [] })
    if (u.includes('/booking/v1/reservations')) return Promise.resolve({ reservations: world.reservations ?? [] })
    return Promise.reject(new Error('unexpected ' + u))
  })
}
const lcoQuota = (sold: number, quota = 1) => ({
  timeSlices: [
    {
      services: [
        {
          service: { id: 'MOT-LCO' },
          serviceDate: '2026-09-13',
          quantity: quota,
          soldCount: sold,
          availableCount: Math.max(0, quota - sold),
        },
      ],
    },
  ],
})
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('which day it asks about', () => {
  it('books a late checkout against the LAST NIGHT, and lists that day departures', async () => {
    // Verified live: a 14.09 departure with the service showed as sold on
    // serviceDate 13.09. Our own sales are on the reservations LEAVING 14.09.
    apaleo({ availability: lcoQuota(0) })
    const q = await stayExtensionQuota('late', 'MOT-LCO', stay)

    expect(urls()[0]).toBe('/availability/v1/services?propertyId=MOT&from=2026-09-13&to=2026-09-14')
    expect(urls()[1]).toContain('dateFilter=Departure&from=2026-09-14T00%3A00%3A00Z'.replace(/%3A/g, ':'))
    expect(q?.serviceDate).toBe('2026-09-13')
  })

  it('books an early check-in against the arrival day itself', async () => {
    apaleo({
      availability: {
        timeSlices: [
          { services: [{ service: { id: 'MOT-ECI' }, serviceDate: '2026-09-10', quantity: 3, soldCount: 0, availableCount: 3 }] },
        ],
      },
    })
    const q = await stayExtensionQuota('early', 'MOT-ECI', stay)

    expect(urls()[0]).toBe('/availability/v1/services?propertyId=MOT&from=2026-09-10&to=2026-09-11')
    expect(urls()[1]).toContain('dateFilter=Arrival&from=2026-09-10T00:00:00Z')
    expect(q?.serviceDate).toBe('2026-09-10')
  })
})

describe('what is left to sell', () => {
  it('is what Apaleo has left, minus what we sold without Apaleo noticing', async () => {
    // Quota 1. Apaleo sold none. We sold one — a fee line on the folio of a
    // reservation leaving that day, no service booked. Nothing is left.
    apaleo({
      availability: lcoQuota(0),
      reservations: [{ id: 'OURS-1', status: 'Confirmed', services: [] }],
      folios: [{ reservation: { id: 'OURS-1' }, charges: [{ name: 'Late Check-Out' }] }],
    })

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toMatchObject({
      quota: 1,
      soldByApaleo: 0,
      soldByUs: 1,
      remaining: 0,
    })
  })

  it('does not count a sale twice when the folio line sits next to the Apaleo service', async () => {
    // Booked at booking time: the service is on the reservation AND we posted
    // the fee. Apaleo already counted that one.
    apaleo({
      availability: lcoQuota(1),
      reservations: [{ id: 'BOTH-1', status: 'Confirmed', services: [{ service: { id: 'MOT-LCO' } }] }],
      folios: [{ reservation: { id: 'BOTH-1' }, charges: [{ name: 'Late Check-Out' }] }],
    })

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toMatchObject({ soldByApaleo: 1, soldByUs: 0, remaining: 0 })
  })

  it('leaves the buyer own reservation out of the count', async () => {
    apaleo({
      availability: lcoQuota(0),
      reservations: [{ id: 'ME-1', status: 'Confirmed', services: [] }],
      folios: [{ reservation: { id: 'ME-1' }, charges: [{ name: 'Late Check-Out' }] }],
    })

    expect(
      await stayExtensionQuota('late', 'MOT-LCO', stay, { excludeReservationId: 'ME-1' }),
    ).toMatchObject({ soldByUs: 0, remaining: 1 })
  })

  it('ignores cancelled and no-show reservations', async () => {
    apaleo({
      availability: lcoQuota(0),
      reservations: [
        { id: 'C-1', status: 'Canceled', services: [] },
        { id: 'N-1', status: 'NoShow', services: [] },
      ],
      folios: [
        { reservation: { id: 'C-1' }, charges: [{ name: 'Late Check-Out' }] },
        { reservation: { id: 'N-1' }, charges: [{ name: 'Late Check-Out' }] },
      ],
    })

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toMatchObject({ soldByUs: 0, remaining: 1 })
  })

  it('does not mistake the other product for this one', async () => {
    apaleo({
      availability: lcoQuota(0),
      reservations: [{ id: 'E-1', status: 'Confirmed', services: [] }],
      folios: [{ reservation: { id: 'E-1' }, charges: [{ name: 'Early Check-In' }] }],
    })

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toMatchObject({ soldByUs: 0, remaining: 1 })
  })
})

describe('when there is nothing to enforce', () => {
  it('answers null when Apaleo has no quota for the service', async () => {
    apaleo({
      availability: {
        timeSlices: [{ services: [{ service: { id: 'MOT-LCO' }, serviceDate: '2026-09-13', quantity: null, soldCount: 4 }] }],
      },
    })

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toBeNull()
  })

  it('answers null when the service is not in the answer at all', async () => {
    apaleo({ availability: { timeSlices: [] } })

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toBeNull()
  })

  it('lets the sale go on when the counter cannot be read — and says so', async () => {
    // A limit on how many to sell is a business rule, not a safety one.
    fetchMock.mockRejectedValue(new Error('503'))

    expect(await stayExtensionQuota('late', 'MOT-LCO', stay)).toBeNull()
    expect(log.error).toHaveBeenCalledWith(
      'stay-extension quota: could not be read — allowing the sale',
      expect.objectContaining({ serviceId: 'MOT-LCO' }),
    )
  })
})

describe('where it is enforced', () => {
  it('before the card, in both validators, and once more at the moment of sale', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const validator = readFileSync(join(process.cwd(), 'lib/payments-validation.ts'), 'utf8')
    const sale = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')

    // Cabinet purchase (validateServicesPayment) and purchase with the room
    // (validatePaymentAmount) — two call sites in the validator.
    expect(validator.split('await stayExtensionQuota(').length - 1).toBe(2)
    // And the sale itself, for two buyers of the last one in the same minute.
    expect(sale).toContain('await stayExtensionQuota(kind, payload.serviceId, ctx')
  })
})
