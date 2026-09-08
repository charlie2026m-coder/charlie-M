import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The guard that stops us charging a stay that is already gone.
 *
 * Until 2026-09-08 every money path in this codebase asked only about its own
 * Supabase row — pending, processing, completed — and never about the
 * reservation. A guest who cancelled between paying and the capture landing was
 * charged anyway, and the reconcile cron could finish a stuck purchase hours
 * later against a booking that no longer existed.
 *
 * Two mistakes are possible here and they are not symmetrical. Charging a
 * cancelled guest takes money nobody is owed. Refusing a good charge strands a
 * guest without the extras they paid for and reverses a live Adyen payment. So
 * the refusal must be narrow: Apaleo saying the stay is gone, and nothing else.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({ Fetch: (...a: unknown[]) => fetchMock(...a) }))
vi.mock('@/lib/logger', () => ({
  apaleoLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { reservationChargeable, isRefusedVerdict } = await import(
  '@/services/apaleo/reservationChargeable'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('reading whether a reservation may still be charged', () => {
  it('refuses a cancelled stay', async () => {
    fetchMock.mockResolvedValue({ status: 'Canceled' })
    expect(await reservationChargeable('ABC-1')).toBe('Canceled')
  })

  it('refuses a no-show', async () => {
    // Whatever a no-show owes is a fee the hotel posts, never an extra or a
    // date change bought after the fact.
    fetchMock.mockResolvedValue({ status: 'NoShow' })
    expect(await reservationChargeable('ABC-1')).toBe('NoShow')
  })

  it('allows every live stay', async () => {
    for (const status of ['Confirmed', 'InHouse', 'CheckedOut']) {
      fetchMock.mockResolvedValue({ status })
      expect(await reservationChargeable('ABC-1'), status).toBe('chargeable')
    }
  })

  it('allows an unfamiliar status rather than guessing', async () => {
    // Apaleo may add states. An unknown one is not a cancellation, and treating
    // it as one would reverse good payments the day it appears.
    fetchMock.mockResolvedValue({ status: 'Tentative' })
    expect(await reservationChargeable('ABC-1')).toBe('chargeable')
  })
})

describe('what happens when Apaleo cannot be read', () => {
  it('answers unknown when the call fails', async () => {
    fetchMock.mockRejectedValue(new Error('502'))
    expect(await reservationChargeable('ABC-1')).toBe('unknown')
  })

  it('answers unknown when the status is missing', async () => {
    fetchMock.mockResolvedValue({})
    expect(await reservationChargeable('ABC-1')).toBe('unknown')
  })

  it('does not treat unknown as a refusal', async () => {
    // The fail-open decision, pinned. The rule being implemented is "if it is
    // cancelled, do not take the money" — a blip is not a cancellation, and
    // failing closed would trade a real problem for an invented one.
    expect(isRefusedVerdict('unknown')).toBe(false)
    expect(isRefusedVerdict('chargeable')).toBe(false)
    expect(isRefusedVerdict('Canceled')).toBe(true)
    expect(isRefusedVerdict('NoShow')).toBe(true)
  })

  it('never calls Apaleo without a reservation id', async () => {
    expect(await reservationChargeable('')).toBe('unknown')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
