/**
 * How much of each payment a cancellation gives back.
 *
 * Pure on purpose. This is the arithmetic that decides what leaves a live
 * Adyen account, and it used to live inline inside cancelAndRefundReservation
 * between two Apaleo reads — where the only way to check it was to reason about
 * it. Out here it is pinned by tests/refundPlanning.test.ts.
 *
 * The rules it encodes:
 *
 *   * Room money is treated as ONE pot. A booking can be paid in several parts —
 *     the original payment, and a top-up paid to move the stay to pricier dates —
 *     and the cancellation penalty applies to the stay, not to each payment. So
 *     the entitlement is computed on the total and then handed back across the
 *     payments, rather than each payment being penalised separately.
 *
 *   * The penalty is kept out of the ORIGINAL payment where possible: refunds
 *     are allocated to the later payments first. Same total either way; this is
 *     just the more natural "the deposit is what we keep".
 *
 *   * Services are never touched by the penalty.
 *
 *   * Refunds already made come off what is still owed. Where they EXCEED the
 *     entitlement the guest has been over-refunded already; this cannot claw
 *     that back, so it is reported for a human instead of quietly reducing
 *     someone else's line.
 *
 * Working on the total is what makes prior refunds come out right. An earlier
 * version drew the penalty from each room payment's GROSS capture, so a payment
 * that had already been refunded still "absorbed" penalty the hotel no longer
 * held — and the remaining payment was then handed back in full. On 200 EUR
 * refunded, a 130 EUR top-up and an 80 EUR penalty it refunded 130 where 50 was
 * owed.
 */

export interface EntitlementInput {
  /**
   * Captured cents per Adyen psp, gross of refunds. Refunds do NOT belong here —
   * they live on /folios/{id}/refunds and are passed separately below, because
   * this function nets them itself.
   */
  capturedByPsp: Map<string, number>
  /** Cents already refunded per psp, from the folio. */
  refundedByPsp: Map<string, number>
  /** Every psp that is room money: the booking payment and any top-up. */
  roomPsps: Set<string>
  /** The booking payment — the one the penalty is kept from first. */
  primaryRoomPsp: string | null
  /** The cancellation penalty, 0 while cancelling is still free. */
  feeCents: number
}

export interface EntitlementLine {
  psp: string
  refundCents: number
  isRoom: boolean
}

export interface EntitlementResult {
  lines: EntitlementLine[]
  /** Prior refunds beyond what the guest was entitled to. Surfaced, not netted. */
  priorOverRefundCents: number
  /** Penalty no remaining payment could cover — the hotel under-collects by this. */
  feeUnappliedCents: number
}

const remainingOn = (psp: string, captured: Map<string, number>, refunded: Map<string, number>) =>
  Math.max(0, (captured.get(psp) ?? 0) - (refunded.get(psp) ?? 0))

export function planEntitlements(input: EntitlementInput): EntitlementResult {
  const { capturedByPsp, refundedByPsp, roomPsps, primaryRoomPsp, feeCents } = input

  // Membership decides everything below, so derive it once. A primary that was
  // never added to roomPsps must not be treated as room money AND as a service:
  // an earlier version sorted it into two buckets and emitted two lines for the
  // same payment, which would have posted the same refund to Apaleo twice.
  const isRoom = (psp: string) => roomPsps.has(psp)
  const allPsps = [...capturedByPsp.keys()]
  const roomList = allPsps.filter(isRoom)
  const serviceList = allPsps.filter((p) => !isRoom(p))

  // ── Room money, as one pot ────────────────────────────────────────────────
  const roomCaptured = roomList.reduce((sum, p) => sum + (capturedByPsp.get(p) ?? 0), 0)
  const roomRefunded = roomList.reduce((sum, p) => sum + (refundedByPsp.get(p) ?? 0), 0)
  const roomEntitlement = Math.max(0, roomCaptured - feeCents)

  let roomStillOwed = Math.max(0, roomEntitlement - roomRefunded)
  const priorOverRefundRoom = Math.max(0, roomRefunded - roomEntitlement)

  // Penalty the room money could not cover at all. The other shortfall — money
  // already handed back before the cancellation — surfaces as an over-refund
  // rather than here, because those are different problems for a human.
  const feeUnappliedCents = Math.max(0, feeCents - roomCaptured)

  // Hand the refund back to the later payments first, so what the hotel keeps
  // comes out of the original one.
  const payoutOrder = [
    ...roomList.filter((p) => p !== primaryRoomPsp),
    ...roomList.filter((p) => p === primaryRoomPsp),
  ]
  const roomLines = new Map<string, number>()
  for (const psp of payoutOrder) {
    if (roomStillOwed <= 0) {
      roomLines.set(psp, 0)
      continue
    }
    const payable = Math.min(roomStillOwed, remainingOn(psp, capturedByPsp, refundedByPsp))
    roomLines.set(psp, payable)
    roomStillOwed -= payable
  }

  // ── Services: untouched by the penalty, each on its own ───────────────────
  let priorOverRefundServices = 0
  const serviceLines = new Map<string, number>()
  for (const psp of serviceList) {
    const captured = capturedByPsp.get(psp) ?? 0
    const refunded = refundedByPsp.get(psp) ?? 0
    if (refunded > captured) priorOverRefundServices += refunded - captured
    serviceLines.set(psp, Math.max(0, captured - refunded))
  }

  const lines: EntitlementLine[] = [
    ...roomList.map((psp) => ({ psp, refundCents: roomLines.get(psp) ?? 0, isRoom: true })),
    ...serviceList.map((psp) => ({ psp, refundCents: serviceLines.get(psp) ?? 0, isRoom: false })),
  ]

  return {
    lines,
    priorOverRefundCents: priorOverRefundRoom + priorOverRefundServices,
    feeUnappliedCents,
  }
}
