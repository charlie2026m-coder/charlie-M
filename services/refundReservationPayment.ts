import { checkout } from '@/lib/adyen'
import { adyenLog } from '@/lib/logger'

/**
 * Partial refund of a captured Adyen payment for a single reservation.
 *
 * Used by guest-initiated cancellation. A booking's folios are captured at
 * booking time, so the money is settled — this calls
 * POST /payments/{pspReference}/refunds (refundCapturedPayment) with an
 * explicit amount, NOT refundOrCancelPayment: one pspReference backs N
 * reservations, so cancelling one room must refund only that room's amount.
 *
 * The call is asynchronous on Adyen's side — a `[refused]` or success here
 * means "accepted", the final outcome arrives via the REFUND / REFUND_FAILED
 * webhook. `reference` is echoed back as the webhook's merchantReference, so
 * pass the reservation id to let the webhook match the refund row.
 */
export async function refundCapturedReservationPayment(
  pspReference: string,
  amountCents: number,
  currency: string,
  reference: string,
): Promise<{ success: boolean; modificationRef?: string; status?: string; error?: string }> {
  adyenLog.info('partial refund initiating', { pspReference, amountCents, currency, reference })

  try {
    const response = await checkout.ModificationsApi.refundCapturedPayment(pspReference, {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
      amount: { value: amountCents, currency },
      reference,
    })

    adyenLog.success('partial refund accepted by Adyen — final result via webhook', {
      pspReference,
      modificationRef: response.pspReference,
      status: response.status,
    })

    return { success: true, modificationRef: response.pspReference, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    adyenLog.error('partial refund FAILED — payment charged but refund not accepted, manual action required', {
      pspReference,
      amountCents,
      reference,
      error: message,
    })
    return { success: false, error: message }
  }
}
