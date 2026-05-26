import { getOrRefreshToken } from '@/services/Request'
import { authorizationLog } from '@/lib/logger'

const APALEO_API_URL = 'https://api.apaleo.com'

/**
 * Cancel an Apaleo authorization. Best-effort: returns an outcome but never
 * throws — used in cleanup paths where we don't want a cancel failure to
 * mask the original error or block the downstream Adyen refund.
 *
 * If this fails, the authorization will expire naturally (28 days) and hotel
 * staff can release it manually from the Apaleo dashboard. The Adyen refund
 * still runs after this and returns the money to the guest regardless.
 */
export async function cancelAuthorization(
  authorizationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getOrRefreshToken()

    authorizationLog.info('PUT /authorization-actions/{id}/cancel', { authorizationId })

    const response = await fetch(
      `${APALEO_API_URL}/booking/v1/authorization-actions/${authorizationId}/cancel`,
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
      authorizationLog.error('cancel failed', {
        authorizationId,
        status: response.status,
        error: errorBody,
      })
      return {
        success: false,
        error: `Apaleo ${response.status}: ${JSON.stringify(errorBody)}`,
      }
    }

    authorizationLog.success('authorization cancelled', { authorizationId })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    authorizationLog.error('cancel threw', { authorizationId, error: message })
    return { success: false, error: message }
  }
}
