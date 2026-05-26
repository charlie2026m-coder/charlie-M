import { getOrRefreshToken } from '@/services/Request'
import { authorizationLog } from '@/lib/logger'

const APALEO_API_URL = 'https://api.apaleo.com'

interface CreateAuthorizationResponse {
  id: string
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Register an Adyen pre-authorization with Apaleo as a booking-level
 * authorization. The returned id covers folios in every reservation of the
 * booking, enabling multi-folio captures from a single prepay charge.
 *
 * Retries 3× on 5xx and network errors. Throws immediately on 4xx.
 */
export async function createBookingAuthorization(params: {
  bookingId: string
  propertyId: string
  pspReference: string
  amount: { amount: number; currency: string }
  maxAttempts?: number
}): Promise<string> {
  const { bookingId, propertyId, pspReference, amount, maxAttempts = 3 } = params

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const delayMs = Math.pow(2, attempt - 1) * 1000
      authorizationLog.warn('retry', {
        bookingId,
        attempt: `${attempt}/${maxAttempts}`,
        delayMs,
      })
      await delay(delayMs)
    }

    try {
      const token = await getOrRefreshToken()

      authorizationLog.info('POST /authorizations/by-authorization', {
        bookingId,
        pspReference,
        amount,
        attempt: `${attempt}/${maxAttempts}`,
      })

      const response = await fetch(
        `${APALEO_API_URL}/booking/v1/authorizations/by-authorization`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            target: { type: 'Booking', id: bookingId, propertyId },
            amount,
            transactionReference: pspReference,
          }),
        },
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        const status = response.status

        if (status >= 400 && status < 500) {
          authorizationLog.error('client error — not retrying', {
            bookingId,
            status,
            error: errorBody,
          })
          throw new Error(`Apaleo booking authorization creation failed (${status}): ${JSON.stringify(errorBody)}`)
        }

        lastError = new Error(`Apaleo ${status}: ${JSON.stringify(errorBody)}`)
        authorizationLog.warn('server error — will retry', {
          bookingId,
          status,
          error: errorBody,
          attempt: `${attempt}/${maxAttempts}`,
        })
        continue
      }

      const data = (await response.json()) as CreateAuthorizationResponse
      authorizationLog.success('booking-level authorization created', {
        bookingId,
        authorizationId: data.id,
      })
      return data.id
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Apaleo booking authorization creation failed')) {
        throw err
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      authorizationLog.warn('network error — will retry', {
        bookingId,
        error: lastError.message,
        attempt: `${attempt}/${maxAttempts}`,
      })
    }
  }

  authorizationLog.error('exhausted retries', {
    bookingId,
    lastError: lastError?.message,
  })
  throw lastError ?? new Error('createBookingAuthorization: unknown failure')
}
