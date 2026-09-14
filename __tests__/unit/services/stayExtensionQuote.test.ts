import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Apaleo's own word on a stay extension, asked before the money moves.
 *
 * A late checkout or an early check-in is applied as a reservation amend, and
 * Apaleo decides whether that amend is on offer: not when the time would be
 * unchanged, not once the reservation can no longer be amended, not when the
 * rate plan has nothing for that day. The sale used to ask only inside the
 * Adyen webhook — after the charge — so "Apaleo says no" meant charge, refuse,
 * refund. The validator behind make-payment now asks first, through the same
 * helper the sale itself uses, so the two can never disagree.
 *
 * What this is NOT: a check against the opposite product on the same room.
 * Apaleo's availability is per night; on 2026-09-11 it offered a 13:00 early
 * check-in on a room whose guest had a 13:00 late checkout. That collision is
 * hasOppositeExtensionConflict's job.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({ Fetch: (...a: unknown[]) => fetchMock(...a) }))
vi.mock('@/lib/logger', () => ({
  apaleoLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/slack', () => ({ notifySlack: vi.fn(() => Promise.resolve()) }))

process.env.APALEO_PROPERTY_ID = 'MOT'

const { quoteStayExtension } = await import('@/services/apaleo/amendStayTime')

const ctx = { arrival: '2026-09-11T15:00:00+02:00', departure: '2026-09-13T11:00:00+02:00' }
const offer = { arrival: ctx.arrival, departure: ctx.departure, availableUnits: 1, timeSlices: [] }
const urlOf = () => String(fetchMock.mock.calls[0][0])

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockResolvedValue({ offers: [offer] })
})

describe('what it asks Apaleo', () => {
  it('asks for 13:00 on the arrival day, keeping the hotel offset', async () => {
    await quoteStayExtension('R-1', 'early', ctx)

    expect(urlOf()).toBe('/booking/v1/reservations/R-1/offers?arrival=2026-09-11T13%3A00%3A00%2B02%3A00')
  })

  it('asks for 13:00 on the departure day for a late checkout', async () => {
    await quoteStayExtension('R-1', 'late', ctx)

    expect(urlOf()).toBe('/booking/v1/reservations/R-1/offers?departure=2026-09-13T13%3A00%3A00%2B02%3A00')
  })

  it('does not mutate anything — it is a GET', async () => {
    await quoteStayExtension('R-1', 'early', ctx)

    expect(fetchMock.mock.calls[0][1]).toBeUndefined()
  })
})

describe('what counts as available', () => {
  it('returns the offer when Apaleo has one', async () => {
    expect(await quoteStayExtension('R-1', 'early', ctx)).toEqual(offer)
  })

  it('returns nothing when Apaleo answers with nothing (a 204 arrives as {})', async () => {
    fetchMock.mockResolvedValue({})

    expect(await quoteStayExtension('R-1', 'early', ctx)).toBeNull()
  })

  it('returns nothing when the offer has no units', async () => {
    fetchMock.mockResolvedValue({ offers: [{ ...offer, availableUnits: 0 }] })

    expect(await quoteStayExtension('R-1', 'late', ctx)).toBeNull()
  })

  it('returns nothing when Apaleo cannot be reached — a sale does not go ahead on a guess', async () => {
    // The webhook would fail the same amend minutes later and refund. Refusing
    // now costs the guest a retry; charging now costs them a refund.
    fetchMock.mockRejectedValue(new Error('503'))

    expect(await quoteStayExtension('R-1', 'early', ctx)).toBeNull()
  })
})

describe('one source of truth', () => {
  it('the sale and the pre-payment validator ask through the same helper', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const sale = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')
    const validator = readFileSync(join(process.cwd(), 'lib/payments-validation.ts'), 'utf8')

    expect(sale).toContain('const offer = await quoteStayExtension(reservationId, kind, ctx)')
    const at = validator.indexOf('await quoteStayExtension(')
    expect(at).toBeGreaterThan(0)
    // …in the auth phase: the nearest phase check above the call must be the
    // auth one. The webhook runs the sale, which asks again itself.
    const nearestPhaseCheck = validator.lastIndexOf('phase ===', at)
    expect(nearestPhaseCheck).toBeGreaterThan(0)
    expect(validator.slice(nearestPhaseCheck, nearestPhaseCheck + 16)).toBe("phase === 'auth'")
  })
})
