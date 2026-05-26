import { getOrRefreshToken } from '@/services/Request'
import { paymentAccountLog } from '@/lib/logger'

const APALEO_API_URL = 'https://api.apaleo.com'

/**
 * Cancel an Apaleo Payment Account. Best-effort: never throws — used in
 * cleanup paths where a cancel failure must not block the Adyen refund.
 * Surviving payment accounts can be cancelled manually from the Apaleo
 * dashboard or expire naturally with the backing Adyen authorization.
 */
export async function cancelPaymentAccount(
  paymentAccountId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getOrRefreshToken()

    paymentAccountLog.info('PUT /payment-account-actions/{id}/cancel', { paymentAccountId })

    const response = await fetch(
      `${APALEO_API_URL}/booking/v1/payment-account-actions/${paymentAccountId}/cancel`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      },
    )

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      paymentAccountLog.error('cancel failed', {
        paymentAccountId,
        status: response.status,
        error: errorBody,
      })
      return {
        success: false,
        error: `Apaleo ${response.status}: ${JSON.stringify(errorBody)}`,
      }
    }

    paymentAccountLog.success('payment account cancelled', { paymentAccountId })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    paymentAccountLog.error('cancel threw', { paymentAccountId, error: message })
    return { success: false, error: message }
  }
}
