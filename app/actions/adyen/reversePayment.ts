import { checkout } from "@/lib/adyen"
import { cancelAuthorization } from "@/services/apaleo/cancelAuthorization"
import { adyenLog } from "@/lib/logger"

interface ReversePaymentOptions {
  /**
   * Apaleo booking-level authorization IDs (from authorizations/by-authorization).
   * Cancelled best-effort BEFORE the Adyen refund. Failures are logged and
   * do not block the refund — leftover Apaleo authorizations expire in 28 days.
   */
  apaleoAuthorizationIds?: string[]
  internalReference?: string
}

/**
 * Backwards-compatible signature: also accepts a plain string as the second
 * argument to mean `internalReference` — keeps legacy callers working
 * (e.g. tests that pass `reversePayment(psp, ref)`).
 *
 * Uses Reversal (refundOrCancelPayment) — not a manual Refund. Adyen decides
 * automatically: cancel if not yet captured, refund if already captured.
 */
export async function reversePayment(
  pspReference: string,
  optionsOrReference: ReversePaymentOptions | string = {},
): Promise<{
  success: boolean
  status?: string
  error?: string
  apaleoCancelResults?: { authorizationId: string; success: boolean; error?: string }[]
}> {
  const options: ReversePaymentOptions =
    typeof optionsOrReference === 'string'
      ? { internalReference: optionsOrReference }
      : optionsOrReference
  const { apaleoAuthorizationIds = [], internalReference } = options

  adyenLog.info('reversal initiating', {
    pspReference,
    internalReference: internalReference ?? null,
    apaleoAuthCount: apaleoAuthorizationIds.length,
  })

  // Cancel Apaleo authorizations first so the holds don't linger in Apaleo
  // dashboards after the Adyen money goes back.
  let apaleoCancelResults: { authorizationId: string; success: boolean; error?: string }[] | undefined
  if (apaleoAuthorizationIds.length > 0) {
    const settled = await Promise.allSettled(
      apaleoAuthorizationIds.map(id => cancelAuthorization(id))
    )
    apaleoCancelResults = settled.map((r, i) => {
      const authorizationId = apaleoAuthorizationIds[i]
      if (r.status === 'fulfilled') {
        return { authorizationId, success: r.value.success, error: r.value.error }
      }
      return { authorizationId, success: false, error: String(r.reason) }
    })

    const failed = apaleoCancelResults.filter(r => !r.success)
    if (failed.length > 0) {
      adyenLog.warn('reversal: some Apaleo cancels failed — continuing with Adyen refund', {
        failed: failed.length,
        total: apaleoAuthorizationIds.length,
      })
    }
  }

  try {
    const response = await checkout.ModificationsApi.refundOrCancelPayment(
      pspReference,
      {
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
        ...(internalReference && { reference: internalReference }),
      }
    )

    adyenLog.success('reversal accepted by Adyen — final result via webhook', {
      pspReference,
      status: response.status,
    })

    return { success: true, status: response.status, apaleoCancelResults }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    adyenLog.error('reversal FAILED — MANUAL ACTION REQUIRED, payment charged but reversal not accepted', {
      pspReference,
      error: message,
    })
    return { success: false, error: message, apaleoCancelResults }
  }
}
