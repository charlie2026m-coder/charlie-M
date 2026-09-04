import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * That a logged error reaches Sentry.
 *
 * The money paths in this codebase catch their errors instead of throwing — a
 * failed refund is logged and the request still answers 200, because throwing
 * would undo work Apaleo already did. So Sentry's own capture of unhandled
 * exceptions sees almost none of what matters, and the logger hook is what
 * actually delivers the alert. If that hook silently stops firing, nothing
 * else in the app breaks and nobody finds out until a guest complains.
 */

const captureException = vi.fn()
const captureMessage = vi.fn()
const addBreadcrumb = vi.fn()
const scope = {
  setTag: vi.fn(),
  setContext: vi.fn(),
  setFingerprint: vi.fn(),
  setTransactionName: vi.fn(),
}

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  addBreadcrumb: (...args: unknown[]) => addBreadcrumb(...args),
  withScope: (fn: (s: typeof scope) => void) => fn(scope),
}))

const { logger, bookingLog } = await import('@/lib/logger')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('a logged error', () => {
  it('is reported as a Sentry message with its context', () => {
    bookingLog.error('rebook: amend failed — nothing moved, lock released', {
      reservationId: 'ZCELHAPN-1',
      refundCents: 34571,
    })

    expect(captureMessage).toHaveBeenCalledWith(
      'rebook: amend failed — nothing moved, lock released',
      'error',
    )
    expect(scope.setTag).toHaveBeenCalledWith('area', 'booking')
    expect(scope.setContext).toHaveBeenCalledWith('details', {
      reservationId: 'ZCELHAPN-1',
      refundCents: 34571,
    })
  })

  it('is reported as an exception when a real Error is passed, keeping the stack', () => {
    const err = new Error('Apaleo 502')
    logger.error('folio payment failed', { reservationId: 'ZCELHAPN-1' }, err)

    expect(captureException).toHaveBeenCalledWith(err)
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('groups by the static message, not by the ids it carries', () => {
    // Otherwise one recurring failure becomes one issue per booking and the
    // inbox is useless within a day.
    bookingLog.error('refund failed', { reservationId: 'AAA-1' })
    bookingLog.error('refund failed', { reservationId: 'BBB-1' })

    expect(scope.setFingerprint).toHaveBeenNthCalledWith(1, ['booking', 'refund failed'])
    expect(scope.setFingerprint).toHaveBeenNthCalledWith(2, ['booking', 'refund failed'])
  })
})

describe('everything else', () => {
  it('turns a warning into a breadcrumb rather than an issue', () => {
    // Warnings are the trail leading up to an error. Sending them as issues
    // would exhaust the event quota and bury the failures that matter.
    bookingLog.warn('offer tier not on offer, falling back', { nights: 4 })

    expect(captureMessage).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: 'booking',
      level: 'warning',
      message: 'offer tier not on offer, falling back',
      data: { nights: 4 },
    })
  })

  it('says nothing to Sentry on info or debug', () => {
    logger.info('price trace', { total: 34571 })
    logger.debug('cache hit')

    expect(captureMessage).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
    expect(addBreadcrumb).not.toHaveBeenCalled()
  })
})
