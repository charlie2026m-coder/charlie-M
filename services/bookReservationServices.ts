import { Fetch } from '@/services/Request'
import { folioLog } from '@/lib/logger'

interface ServiceDate {
  serviceDate: string
  count?: number
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
 * Capture the late-added-services charge directly from its dedicated Adyen
 * authorization via `POST /finance/v1/folios/{id}/payments/by-authorization`.
 *
 * Why NOT a Payment Account here (unlike /api/bookings/create): Apaleo allows
 * only ONE payment account per reservation, and booking-create already consumed
 * it for the room capture (status Success). Our payment account is also a
 * one-shot capture of the room authorization (created without a recurring
 * `payerReference`), so it can neither be re-created nor re-charged for the new
 * services money. The services payment has its OWN CaptureOnly Adyen auth, so
 * we capture from it directly — Apaleo's documented "implement your own
 * prepayment automation" path. No payment account is involved.
 *
 * Idempotent + pending-aware capture. Uses BOTH folio signals:
 *   - `allowedPayment` (how much may be paid right now = gross owed minus any
 *     pending payments) decides whether a capture is needed at all. When it is
 *     <= 0 a payment already covers the open balance — typically our OWN earlier
 *     by-authorization still pending on a retry/duplicate delivery — so we skip
 *     instead of POSTing again, which Apaleo rejects with 422 "cannot pay more
 *     than the open balance with pending payments".
 *   - `balance` (excludes pending) gates the under-booking check, but ONLY when
 *     nothing is pending, so money already in flight is never mistaken for
 *     missing charges. The capture amount is capped at `allowedPayment` so the
 *     call can never exceed the open balance.
 */
async function payServicesFolioByAuthorization(params: {
  reservationId: string
  pspReference: string
  expectedChargeCents: number
  currency?: string
  maxAttempts?: number
}): Promise<{ success: true; skipped?: boolean; amount?: number } | { success: false; error: string }> {
  const {
    reservationId,
    pspReference,
    expectedChargeCents,
    currency = 'EUR',
    maxAttempts = 3,
  } = params
  const folioId = `${reservationId}-1`

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const folio = await Fetch<FolioCaptureView>(`/finance/v1/folios/${folioId}`)

      // Apaleo folio model (verified against the live 422 message):
      //   balance.amount = settledPayments − charges  (negative ⇒ guest owes)
      //   allowedPayment = charges − settledPayments − pendingPayments
      //                  = how much Apaleo will accept RIGHT NOW
      const balance = folio.balance?.amount ?? 0
      const allowedPayment = folio.allowedPayment ?? 0
      const owedCents = Math.round(-balance * 100)          // gross owed, excl. pending
      const allowedCents = Math.round(allowedPayment * 100) // payable right now
      const pendingCents = owedCents - allowedCents         // payments already pending

      folioLog.info('services folio read (by-authorization)', {
        folioId,
        attempt: `${attempt}/${maxAttempts}`,
        balance,
        allowedPayment,
        owedCents,
        allowedCents,
        pendingCents,
        expectedChargeCents,
        pspReference,
      })

      // 1. Already covered: fully settled (balance>=0) OR a pending payment
      //    already covers the open balance (allowedCents<=0). The latter is the
      //    common retry/duplicate case — our OWN earlier by-authorization is
      //    still pending. Capturing again is exactly what Apaleo rejects with
      //    422 "cannot pay more than the open balance with pending payments".
      //    Treat as success: the money is (being) captured, nothing left to do.
      if (balance >= 0 || allowedCents <= 0) {
        folioLog.info('services folio already covered — skipping capture', {
          folioId,
          balance,
          allowedPayment,
          pendingCents,
        })
        return { success: true, skipped: true }
      }

      // 2. Under-booking guard — only when NOTHING is pending. With no pending
      //    payment, owedCents IS the gross service charge; below the validated
      //    total means the charges never fully landed (e.g. a daily service not
      //    expanded per-night) → abort so the caller rolls back + refunds. If a
      //    pending payment exists we must NOT abort: the apparent shortfall is
      //    money already in flight, not missing charges.
      if (pendingCents <= 0 && owedCents < expectedChargeCents) {
        folioLog.error('services: folio owed below expected — aborting capture (under-booking)', {
          folioId,
          owedCents,
          expectedChargeCents,
          pspReference,
        })
        return {
          success: false,
          error: `Folio owes ${owedCents}¢ below expected ${expectedChargeCents}¢ — services likely under-booked`,
        }
      }

      // 3. Capture the validated total, but never more than Apaleo accepts right
      //    now (allowedCents). When part is already pending we capture only the
      //    remainder; pending covers the rest, so the guest pays the validated
      //    total exactly once and the call can never 422.
      const amountToPayCents = Math.min(expectedChargeCents, allowedCents)
      const amountEur = Math.round(amountToPayCents) / 100

      folioLog.info('POST /folios/{id}/payments/by-authorization (services)', {
        folioId,
        amountEur,
        pspReference,
        attempt: `${attempt}/${maxAttempts}`,
      })

      await Fetch(
        `/finance/v1/folios/${folioId}/payments/by-authorization`,
        {
          method: 'POST',
          body: {
            transactionReference: pspReference,
            // pspReference is an Adyen PSP reference; the endpoint also accepts
            // 'AuthorizationId'. Default is PspReference but we set it explicitly
            // so intent is unambiguous and a default change can't break us.
            referenceType: 'PspReference',
            amount: { amount: amountEur, currency: folio.balance?.currency || currency },
          },
        },
      )

      folioLog.success('services folio paid (by-authorization)', { folioId, amountEur, pspReference })
      return { success: true, amount: amountEur }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      folioLog.error('services folio payment failed', {
        folioId,
        attempt: `${attempt}/${maxAttempts}`,
        error: message,
      })

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
        continue
      }

      return { success: false, error: message }
    }
  }

  return { success: false, error: `Failed to pay services folio ${folioId} after ${maxAttempts} attempts` }
}

/**
 * Late-services flow: books services on a reservation, then captures the
 * validated services total directly from the dedicated Adyen authorization via
 * folio by-authorization. No Apaleo Payment Account is created — that slot is
 * one-per-reservation and already consumed by /api/bookings/create's room
 * capture (see payServicesFolioByAuthorization for the full rationale).
 */
export async function bookReservationServicesLegacy(
  reservationId: string,
  services: BookServicePayload[],
  pspReference?: string,
  expectedAmountCents?: number,
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

  // No payment requested — caller handles the rest.
  if (!pspReference) {
    return { services: results, payment: null }
  }

  const paymentResult = await payServicesFolioByAuthorization({
    reservationId,
    pspReference,
    expectedChargeCents: expectedAmountCents ?? 0,
  })

  return { services: results, payment: paymentResult }
}
