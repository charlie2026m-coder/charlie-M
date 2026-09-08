import { describe, expect, it } from 'vitest'
import { planEntitlements } from '@/lib/refundPlanning'

/**
 * What a cancellation gives back.
 *
 * The case that motivated these: a booking paid in two parts — the original
 * payment, and a top-up made to move the stay onto pricier dates. Both are room
 * money, and the penalty applies to the pair. Before that was handled the
 * top-up looked like a service and came back in full on a 100% cancellation.
 */

const ROOM = 'psp-room'
const TOPUP = 'psp-topup'
const SERVICES = 'psp-services'

/** Convenience wrapper: only the interesting inputs need naming per test. */
function plan(opts: {
  captured: Record<string, number>
  refunded?: Record<string, number>
  roomPsps?: string[]
  primary?: string | null
  feeCents?: number
}) {
  return planEntitlements({
    capturedByPsp: new Map(Object.entries(opts.captured)),
    refundedByPsp: new Map(Object.entries(opts.refunded ?? {})),
    roomPsps: new Set(opts.roomPsps ?? [ROOM]),
    primaryRoomPsp: opts.primary === undefined ? ROOM : opts.primary,
    feeCents: opts.feeCents ?? 0,
  })
}

const refundFor = (r: ReturnType<typeof plan>, psp: string) =>
  r.lines.find((l) => l.psp === psp)?.refundCents

describe('cancellation with a single room payment', () => {
  it('refunds everything while cancelling is still free', () => {
    const r = plan({ captured: { [ROOM]: 20000, [SERVICES]: 5000 }, feeCents: 0 })
    expect(refundFor(r, ROOM)).toBe(20000)
    expect(refundFor(r, SERVICES)).toBe(5000)
    expect(r.priorOverRefundCents).toBe(0)
  })

  it('keeps the room but never the services when the penalty is the full stay', () => {
    const r = plan({ captured: { [ROOM]: 20000, [SERVICES]: 5000 }, feeCents: 20000 })
    expect(refundFor(r, ROOM)).toBe(0)
    // Extras are not what the guest is being penalised for.
    expect(refundFor(r, SERVICES)).toBe(5000)
  })

  it('applies a partial penalty to the room only', () => {
    const r = plan({ captured: { [ROOM]: 20000, [SERVICES]: 5000 }, feeCents: 5000 })
    expect(refundFor(r, ROOM)).toBe(15000)
    expect(refundFor(r, SERVICES)).toBe(5000)
  })
})

describe('cancellation after a top-up (two room payments)', () => {
  const captured = { [ROOM]: 20000, [TOPUP]: 13000 }
  const roomPsps = [ROOM, TOPUP]

  it('returns both in full while cancelling is still free', () => {
    const r = plan({ captured, roomPsps, feeCents: 0 })
    expect(refundFor(r, ROOM)).toBe(20000)
    expect(refundFor(r, TOPUP)).toBe(13000)
  })

  it('keeps BOTH when the penalty is the whole amended stay', () => {
    // Apaleo's cancellationFee.fee tracks totalGrossAmount exactly (checked on
    // six live bookings), so after a top-up the penalty is the new total.
    // This is the case that used to hand back the entire top-up.
    const r = plan({ captured, roomPsps, feeCents: 33000 })
    expect(refundFor(r, ROOM)).toBe(0)
    expect(refundFor(r, TOPUP)).toBe(0)
    expect(r.feeUnappliedCents).toBe(0)
  })

  it('draws the penalty from the original payment first', () => {
    const r = plan({ captured, roomPsps, feeCents: 8000 })
    expect(refundFor(r, ROOM)).toBe(12000)
    expect(refundFor(r, TOPUP)).toBe(13000)
  })

  it('spills onto the top-up once the original is exhausted', () => {
    const r = plan({ captured, roomPsps, feeCents: 26000 })
    expect(refundFor(r, ROOM)).toBe(0)
    expect(refundFor(r, TOPUP)).toBe(7000) // 13000 − the 6000 that spilled over
  })

  it('never charges the same penalty twice', () => {
    // The bug this guards: deducting feeCents from EACH room payment.
    const r = plan({ captured, roomPsps, feeCents: 8000 })
    const totalRefund = r.lines.reduce((sum, l) => sum + l.refundCents, 0)
    expect(totalRefund).toBe(20000 + 13000 - 8000)
  })

  it('reports a penalty larger than everything captured instead of hiding it', () => {
    const r = plan({ captured, roomPsps, feeCents: 40000 })
    expect(r.lines.every((l) => l.refundCents === 0)).toBe(true)
    expect(r.feeUnappliedCents).toBe(7000)
  })

  it('does not depend on the order the folio listed the payments', () => {
    const forward = planEntitlements({
      capturedByPsp: new Map([[ROOM, 20000], [TOPUP, 13000], [SERVICES, 5000]]),
      refundedByPsp: new Map(),
      roomPsps: new Set(roomPsps),
      primaryRoomPsp: ROOM,
      feeCents: 26000,
    })
    const reversed = planEntitlements({
      capturedByPsp: new Map([[SERVICES, 5000], [TOPUP, 13000], [ROOM, 20000]]),
      refundedByPsp: new Map(),
      roomPsps: new Set(roomPsps),
      primaryRoomPsp: ROOM,
      feeCents: 26000,
    })
    const asMap = (r: typeof forward) =>
      Object.fromEntries(r.lines.map((l) => [l.psp, l.refundCents]))
    expect(asMap(reversed)).toEqual(asMap(forward))
  })
})

describe('refunds already made on the room', () => {
  // Found by review, confirmed against the module: the penalty used to be drawn
  // from each room payment's GROSS capture, so a payment already refunded still
  // "absorbed" penalty the hotel no longer held — and the top-up was then handed
  // back whole. It returned 130,00 EUR where 50,00 was owed.
  it('does not let an already-refunded payment absorb the penalty', () => {
    const r = plan({
      captured: { [ROOM]: 20000, [TOPUP]: 13000 },
      refunded: { [ROOM]: 20000 },
      roomPsps: [ROOM, TOPUP],
      feeCents: 8000,
    })
    const total = r.lines.reduce((sum, l) => sum + l.refundCents, 0)
    // 33000 paid − 8000 penalty − 20000 already returned.
    expect(total).toBe(5000)
    expect(refundFor(r, ROOM)).toBe(0)
    expect(refundFor(r, TOPUP)).toBe(5000)
  })

  it('collects the penalty from whichever room payment still holds money', () => {
    const r = plan({
      captured: { [ROOM]: 20000, [TOPUP]: 13000 },
      refunded: { [TOPUP]: 13000 },
      roomPsps: [ROOM, TOPUP],
      feeCents: 8000,
    })
    expect(r.lines.reduce((sum, l) => sum + l.refundCents, 0)).toBe(12000)
    expect(refundFor(r, ROOM)).toBe(12000)
  })
})

describe('one line per payment', () => {
  // The ordering used to sort a primary that was not in roomPsps into two
  // buckets at once, emitting the same psp twice — and the execution loop posts
  // one refund per line, so the same money would have gone out twice.
  it('emits exactly one line per captured payment', () => {
    const r = plan({
      captured: { A: 20000, B: 5000 },
      roomPsps: ['B'],
      primary: 'A',
      feeCents: 1000,
    })
    expect(r.lines.length).toBe(2)
    expect(r.lines.map((l) => l.psp).sort()).toEqual(['A', 'B'])
  })

  it('never refunds more than was captured', () => {
    const r = plan({
      captured: { [ROOM]: 20000, [TOPUP]: 13000, [SERVICES]: 5000 },
      roomPsps: [ROOM, TOPUP],
      feeCents: 0,
    })
    expect(r.lines.length).toBe(3)
    expect(r.lines.reduce((sum, l) => sum + l.refundCents, 0)).toBe(38000)
  })
})

describe('refunds already made', () => {
  it('gives back only what is left', () => {
    // e.g. a date change that moved the stay somewhere cheaper and refunded the
    // difference; cancelling afterwards must not pay that back a second time.
    const r = plan({
      captured: { [ROOM]: 20000 },
      refunded: { [ROOM]: 4000 },
      feeCents: 0,
    })
    expect(refundFor(r, ROOM)).toBe(16000)
    expect(r.priorOverRefundCents).toBe(0)
  })

  it('reports an over-refund rather than netting it off another payment', () => {
    const r = plan({
      captured: { [ROOM]: 20000, [SERVICES]: 5000 },
      refunded: { [ROOM]: 18000 },
      feeCents: 5000,
    })
    // Entitlement on the room is 15000, but 18000 was already returned.
    expect(refundFor(r, ROOM)).toBe(0)
    expect(r.priorOverRefundCents).toBe(3000)
    // The services line is untouched by someone else's over-refund.
    expect(refundFor(r, SERVICES)).toBe(5000)
  })
})

describe('degenerate inputs', () => {
  it('handles a folio with no payments', () => {
    const r = plan({ captured: {}, feeCents: 10000 })
    expect(r.lines).toEqual([])
    expect(r.feeUnappliedCents).toBe(10000)
  })

  it('treats an unknown primary as services-only, penalising nothing', () => {
    // Defensive: bookings.transaction_reference can be missing on an old row.
    const r = plan({ captured: { [SERVICES]: 5000 }, roomPsps: [], primary: null, feeCents: 5000 })
    expect(refundFor(r, SERVICES)).toBe(5000)
    expect(r.feeUnappliedCents).toBe(5000)
  })
})
