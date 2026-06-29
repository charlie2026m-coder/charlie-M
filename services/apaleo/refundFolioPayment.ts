import { Fetch } from '@/services/Request'
import { bookingLog } from '@/lib/logger'

export interface FolioRefundResult {
  success: boolean
  refundId?: string
  /** Apaleo refund status at creation: usually "Pending" (settles async). */
  status?: string
  error?: string
}

interface RefundResponse {
  id?: string
  status?: string
}

/**
 * Trigger a refund of a SPECIFIC folio payment THROUGH Apaleo:
 *   POST /finance/v1/folios/{folioId}/payments/{paymentId}/refunds   body: { amount }
 *
 * CRITICAL — this is NOT bookkeeping-only. Apaleo executes the refund via the
 * connected Adyen payment account AND records it on the folio. So this is the
 * SINGLE source of truth for a cancellation refund: do NOT also refund the same
 * payment directly in Adyen — that double-refunds the guest. (Verified live:
 * posting this on an already-refunded payment returns a refund whose status goes
 * Pending → Failure with failureReason "Already fully refunded …".)
 *
 * Notes:
 *   - A free-text `reason` makes Apaleo respond 400, so the body is `{ amount }`
 *     only; the refund's `receipt` auto-links to the source payment's pspReference.
 *   - The refund starts `Pending` and settles asynchronously via Adyen; a returned
 *     id means Apaleo accepted the request.
 *   - Returns the outcome instead of throwing, so the caller can flag a partial
 *     failure for manual review without aborting the whole cancellation.
 */
export async function refundFolioPayment(params: {
  folioId: string
  paymentId: string
  amountCents: number
  currency: string
}): Promise<FolioRefundResult> {
  const { folioId, paymentId, amountCents, currency } = params
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { success: false, error: 'non-positive refund amount' }
  }
  try {
    const res = await Fetch<RefundResponse>(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/payments/${encodeURIComponent(paymentId)}/refunds`,
      { method: 'POST', body: { amount: { amount: amountCents / 100, currency } } },
    )
    if (!res.id) {
      // Apaleo accepted but returned no refund id — the refund happened but we
      // can't track it by id. Loud so reconciliation falls back to the folio.
      bookingLog.warn('apaleo folio refund accepted WITHOUT an id — track via folio', {
        folioId,
        paymentId,
        amountCents,
      })
    }
    bookingLog.success('apaleo folio refund triggered', {
      folioId,
      paymentId,
      amountCents,
      refundId: res.id,
      status: res.status,
    })
    return { success: true, refundId: res.id, status: res.status }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    bookingLog.error('apaleo folio refund failed', { folioId, paymentId, amountCents, error })
    return { success: false, error }
  }
}

interface FolioRefundsListResponse {
  refunds?: Array<{
    id?: string
    sourcePaymentId?: string
    amount?: { amount?: number }
    status?: string
  }>
}

/**
 * Cents ALREADY refunded per folio-payment id across the given folios, so a
 * cancellation never asks Apaleo to refund more than a payment's REMAINING
 * balance. Only `Pending` + `Success` refunds count (money going / gone back);
 * `Failure` and `Canceled` returned nothing, so they must NOT reduce the balance.
 * (Apaleo RefundModel.status ∈ {Pending, Success, Failure, Canceled}.)
 *
 * Keyed on `sourcePaymentId`, which equals the folio payment's `id` (verified
 * live: payment id PCHEZTVY ↔ refund.sourcePaymentId PCHEZTVY).
 *
 * Throws on read failure so the caller can route to manual rather than risk an
 * over-refund computed against a stale/partial view of the folio.
 */
export async function getFolioRefundsByPayment(
  folioIds: string[],
): Promise<Map<string, number>> {
  const refundedByPayment = new Map<string, number>()
  for (const folioId of folioIds) {
    const res = await Fetch<FolioRefundsListResponse>(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/refunds`,
    )
    for (const r of res.refunds ?? []) {
      if (r.status !== 'Pending' && r.status !== 'Success') continue
      const src = r.sourcePaymentId
      const amt = r.amount?.amount
      if (!src || typeof amt !== 'number') continue
      refundedByPayment.set(src, (refundedByPayment.get(src) ?? 0) + Math.round(Math.abs(amt) * 100))
    }
  }
  return refundedByPayment
}

/**
 * refundId → current Apaleo status across the given folios. Used by the
 * reconcile job to advance our 'requested' rows to completed/failed straight off
 * the folio (the source of truth), since an Apaleo-initiated refund carries
 * Apaleo's own reference and can't be matched by the Adyen webhook.
 */
export async function getFolioRefundStatuses(folioIds: string[]): Promise<Map<string, string>> {
  const statusById = new Map<string, string>()
  for (const folioId of folioIds) {
    const res = await Fetch<FolioRefundsListResponse>(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/refunds`,
    )
    for (const r of res.refunds ?? []) {
      if (r.id && r.status) statusById.set(r.id, r.status)
    }
  }
  return statusById
}
