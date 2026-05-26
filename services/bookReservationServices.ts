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
  service: BookServicePayload,
) {
  try {
    await Fetch(
      `/booking/v1/reservation-actions/${reservationId}/book-service`,
      {
        method: 'PUT',
        body: service,
      },
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
 * Capture a folio against an Apaleo Payment Account.
 * Endpoint per Apaleo support: POST /finance/v1/folios/{id}/payments/by-payment-account
 * with body { paymentAccountId, amount: { amount, currency } }.
 *
 * Skip when Apaleo Pay has already auto-covered the folio (allowedPayment=0
 * or balance>=0) — capturing on top would return 422.
 */
export async function payFolioByPaymentAccount(params: {
  reservationId: string
  paymentAccountId: string
  amount: number
  currency?: string
  maxAttempts?: number
}): Promise<{ success: true; skipped?: boolean; amount?: number } | { success: false; error: string }> {
  const {
    reservationId,
    paymentAccountId,
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
        paymentAccountId,
      })

      if (allowedPayment <= 0 || balance >= 0) {
        folioLog.info('folio already covered — skipping capture', {
          folioId,
          balance,
          allowedPayment,
        })
        return { success: true, skipped: true }
      }

      folioLog.info('POST /folios/{id}/payments/by-payment-account', {
        folioId,
        amount,
        currency,
        paymentAccountId,
        attempt: `${attempt}/${maxAttempts}`,
      })

      await Fetch(
        `/finance/v1/folios/${folioId}/payments/by-payment-account`,
        {
          method: 'POST',
          body: {
            paymentAccountId,
            amount: { amount, currency },
          },
        },
      )

      folioLog.success('folio paid', { folioId, amount, currency, paymentAccountId })
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
 * Single-capture folio payment via raw Adyen pspReference. Used by the
 * late-services flow where each add-services request runs its own dedicated
 * Adyen authorization. The initial multi-room booking goes through Apaleo
 * Payment Account instead (see /api/bookings/create).
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
        },
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
 * Late-services flow: books services on a reservation, then captures the
 * folio via a dedicated Adyen pspReference. Initial multi-room bookings use
 * Apaleo Payment Account directly in /api/bookings/create.
 */
export async function bookReservationServicesLegacy(
  reservationId: string,
  services: BookServicePayload[],
  pspReference?: string,
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
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (pspReference) {
    const paymentResult = await payReservationFolioLegacy(reservationId, pspReference)
    return { services: results, payment: paymentResult }
  }

  return { services: results, payment: null }
}
