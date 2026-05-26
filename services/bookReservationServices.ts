import { Fetch } from '@/services/Request'
import { folioLog } from '@/lib/logger'

interface ServiceDate {
  serviceDate: string
  amount?: {
    amount: number
    currency: string
  }
}

interface BookServicePayload {
  serviceId: string
  count?: number
  dates?: ServiceDate[]
}

// Subset of the Apaleo folio payload we need for capture decisions. The
// canonical FolioResponse in types/apaleo.ts is shaped for invoice rendering
// (status, debitor, etc.) and doesn't carry allowedPayment.
interface FolioCaptureView {
  id: string
  balance?: {
    amount: number
    currency: string
  }
  allowedPayment?: number
}

export async function bookReservationService(
  reservationId: string,
  service: BookServicePayload
) {
  try {
    await Fetch(
      `/booking/v1/reservation-actions/${reservationId}/book-service`,
      {
        method: 'PUT',
        body: service,
      }
    )

    folioLog.success('service booked', { reservationId, serviceId: service.serviceId })
    return { success: true }
  } catch (error) {
    folioLog.error('service booking failed', {
      reservationId,
      serviceId: service.serviceId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Capture a booking-level Apaleo authorization against a reservation's folio.
 * The authorization must already exist (POST /booking/v1/authorizations/by-authorization).
 * When Apaleo Pay auto-distributes funds, the folio read returns allowedPayment=0
 * and we skip the explicit capture — the funds settle asynchronously.
 */
async function payReservationFolio(params: {
  reservationId: string
  apaleoAuthorizationId: string
  amount: number
  currency?: string
  maxAttempts?: number
}): Promise<{ success: true; skipped?: boolean; amount?: number } | { success: false; error: string }> {
  const {
    reservationId,
    apaleoAuthorizationId,
    amount,
    currency = 'EUR',
    maxAttempts = 3,
  } = params
  const folioId = `${reservationId}-1`

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const folio = await Fetch<FolioCaptureView>(`/finance/v1/folios/${folioId}`)

      const balance = folio.balance?.amount ?? 0
      const allowedPayment = folio.allowedPayment ?? 0

      folioLog.info('folio read', {
        folioId,
        attempt: `${attempt}/${maxAttempts}`,
        balance,
        allowedPayment,
        intendedAmount: amount,
        currency: folio.balance?.currency || currency,
        apaleoAuthorizationId,
      })

      // Skip if Apaleo Pay already covered the folio: when the booking-level
      // authorization is registered, Apaleo Pay auto-distributes funds across
      // reservation folios as pending payments, leaving allowedPayment=0.
      // Trying to capture on top of that returns
      // "Cannot pay more than the open balance with pending payments".
      // Also covers idempotent retries where the folio is already in credit.
      if (allowedPayment <= 0 || balance >= 0) {
        folioLog.info('folio already covered — skipping capture', {
          folioId,
          balance,
          allowedPayment,
        })
        return { success: true, skipped: true }
      }

      folioLog.info('POST /folios/{id}/payments/by-authorization', {
        folioId,
        amount,
        currency,
        apaleoAuthorizationId,
        attempt: `${attempt}/${maxAttempts}`,
      })

      await Fetch(
        `/finance/v1/folios/${folioId}/payments/by-authorization`,
        {
          method: 'POST',
          body: {
            transactionReference: apaleoAuthorizationId,
            referenceType: 'AuthorizationId',
            amount: {
              amount,
              currency,
            },
          },
        }
      )

      folioLog.success('folio paid', { folioId, amount, currency, apaleoAuthorizationId })
      return { success: true, amount }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      folioLog.error('folio payment failed', {
        folioId,
        attempt: `${attempt}/${maxAttempts}`,
        error: message,
      })

      if (attempt < maxAttempts) {
        const delayMs = attempt * 1000
        folioLog.warn('retrying folio payment', { folioId, delayMs })
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }

      return { success: false, error: message }
    }
  }

  return { success: false, error: `Failed to pay folio ${folioId} after ${maxAttempts} attempts` }
}

/**
 * Legacy single-capture path used by the late-services flow:
 * one Adyen pspReference captures `allowedPayment` on one folio.
 */
async function payReservationFolioLegacy(
  reservationId: string,
  pspReference: string,
  maxAttempts: number = 3,
): Promise<{ success: true; skipped?: boolean; amount?: number } | { success: false; error: string }> {
  const folioId = `${reservationId}-1`

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const folio = await Fetch<FolioCaptureView>(`/finance/v1/folios/${folioId}`)

      const balance = folio.balance?.amount ?? 0
      const allowedPayment = folio.allowedPayment ?? 0

      folioLog.info('legacy folio read', {
        folioId,
        attempt: `${attempt}/${maxAttempts}`,
        balance,
        allowedPayment,
        pspReference,
      })

      if (allowedPayment <= 0 || balance >= 0) {
        folioLog.info('legacy: no payment required — skipping', { folioId, balance, allowedPayment })
        return { success: true, skipped: true }
      }

      await Fetch(
        `/finance/v1/folios/${folioId}/payments/by-authorization`,
        {
          method: 'POST',
          body: {
            transactionReference: pspReference,
            referenceType: 'PspReference',
            amount: {
              amount: allowedPayment,
              currency: folio.balance?.currency || 'EUR',
            },
          },
        }
      )

      folioLog.success('legacy folio paid', { folioId, amount: allowedPayment, pspReference })
      return { success: true, amount: allowedPayment }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      folioLog.error('legacy folio payment failed', {
        folioId,
        attempt: `${attempt}/${maxAttempts}`,
        error: message,
      })

      if (attempt < maxAttempts) {
        const delayMs = attempt * 1000
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }

      return { success: false, error: message }
    }
  }

  return { success: false, error: `Failed to pay folio ${folioId} after ${maxAttempts} attempts` }
}

/**
 * Book services and, when an Apaleo authorization + amount are provided,
 * capture the folio against that authorization. Without them, only the
 * services are booked (e.g. adding extras to an already-paid reservation).
 */
export async function bookReservationServices(
  reservationId: string,
  services: BookServicePayload[],
  apaleoAuthorizationId?: string,
  amount?: number,
  currency: string = 'EUR'
) {
  const results = []

  folioLog.info('booking services', { reservationId, count: services.length })
  for (const service of services) {
    try {
      await bookReservationService(reservationId, service)
      results.push({ serviceId: service.serviceId, success: true })
    } catch (error) {
      results.push({
        serviceId: service.serviceId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (apaleoAuthorizationId && typeof amount === 'number') {
    const paymentResult = await payReservationFolio({
      reservationId,
      apaleoAuthorizationId,
      amount,
      currency,
    })
    return { services: results, payment: paymentResult }
  }

  if (apaleoAuthorizationId || typeof amount === 'number') {
    folioLog.warn('skip capture — only one of apaleoAuthorizationId/amount provided', {
      reservationId,
      hasAuthorizationId: !!apaleoAuthorizationId,
      hasAmount: typeof amount === 'number',
    })
  }

  return { services: results, payment: null }
}

/**
 * Late-services flow: book services and capture the folio via pspReference
 * (a dedicated Adyen authorization for those extras).
 */
export async function bookReservationServicesLegacy(
  reservationId: string,
  services: BookServicePayload[],
  pspReference?: string
) {
  const results = []

  folioLog.info('booking services (legacy)', { reservationId, count: services.length })
  for (const service of services) {
    try {
      await bookReservationService(reservationId, service)
      results.push({ serviceId: service.serviceId, success: true })
    } catch (error) {
      results.push({
        serviceId: service.serviceId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (pspReference) {
    const paymentResult = await payReservationFolioLegacy(reservationId, pspReference)
    return { services: results, payment: paymentResult }
  }

  return { services: results, payment: null }
}
