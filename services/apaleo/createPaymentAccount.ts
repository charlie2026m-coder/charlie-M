import { getOrRefreshToken } from '@/services/Request'
import { paymentAccountLog } from '@/lib/logger'

const APALEO_API_URL = 'https://api.apaleo.com'

interface CreatePaymentAccountResponse {
  id: string
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Register an Adyen authorization as an Apaleo Payment Account on a
 * specific reservation. The same Adyen pspReference can back N payment
 * accounts across the reservations of one booking — per Apaleo support.
 *
 * Retries 3× on 5xx and network errors. Throws immediately on 4xx.
 */
export async function createPaymentAccount(params: {
  reservationId: string
  pspReference: string
  maxAttempts?: number
}): Promise<string> {
  const { reservationId, pspReference, maxAttempts = 3 } = params
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const delayMs = Math.pow(2, attempt - 1) * 1000
      paymentAccountLog.warn('retry', { reservationId, attempt: `${attempt}/${maxAttempts}`, delayMs })
      await delay(delayMs)
    }

    try {
      const token = await getOrRefreshToken()

      paymentAccountLog.info('POST /payment-accounts/by-authorization', {
        reservationId,
        pspReference,
        attempt: `${attempt}/${maxAttempts}`,
      })

      const response = await fetch(
        `${APALEO_API_URL}/booking/v1/payment-accounts/by-authorization`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            target: { type: 'Reservation', id: reservationId },
            transactionReference: pspReference,
          }),
        },
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        const status = response.status

        if (status >= 400 && status < 500) {
          paymentAccountLog.error('client error — not retrying', {
            reservationId,
            status,
            error: errorBody,
          })
          throw new Error(`Apaleo payment account creation failed (${status}): ${JSON.stringify(errorBody)}`)
        }

        lastError = new Error(`Apaleo ${status}: ${JSON.stringify(errorBody)}`)
        paymentAccountLog.warn('server error — will retry', {
          reservationId,
          status,
          error: errorBody,
          attempt: `${attempt}/${maxAttempts}`,
        })
        continue
      }

      const data = (await response.json()) as CreatePaymentAccountResponse
      paymentAccountLog.success('payment account created', {
        reservationId,
        paymentAccountId: data.id,
      })
      return data.id
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Apaleo payment account creation failed')) {
        throw err
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      paymentAccountLog.warn('network error — will retry', {
        reservationId,
        error: lastError.message,
        attempt: `${attempt}/${maxAttempts}`,
      })
    }
  }

  paymentAccountLog.error('exhausted retries', {
    reservationId,
    lastError: lastError?.message,
  })
  throw lastError ?? new Error('createPaymentAccount: unknown failure')
}
