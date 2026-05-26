import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOrRefreshToken } from "@/services/Request"
import { bookReservationServicesLegacy, payFolioByPaymentAccount } from "@/services/bookReservationServices"
import { adyenLog, bookingLog, apaleoLog, folioLog } from "@/lib/logger"
import { reversePayment } from "@/app/actions/adyen/reversePayment"
import { createPaymentAccount } from "@/services/apaleo/createPaymentAccount"
import { cancelReservation } from "@/services/apaleo/cancelReservation"
import crypto from "crypto"

// Webhook has no user session — must use service_role to bypass RLS
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APALEO_API_URL = 'https://api.apaleo.com'
const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || ''

function verifyHmacSignature(notificationItem: any, hmacKey: string): boolean {
  if (!hmacKey) {
    if (process.env.NODE_ENV === 'production') {
      adyenLog.error('ADYEN_HMAC_KEY not set in production — rejecting webhook')
      return false
    }
    return true // Skip verification if no key configured (dev mode).
  }

  try {
    const additionalData = notificationItem.additionalData || {}
    const hmacSignature = additionalData.hmacSignature

    if (!hmacSignature) return false

    const payload = [
      notificationItem.pspReference,
      notificationItem.originalReference || '',
      notificationItem.merchantAccountCode,
      notificationItem.merchantReference,
      notificationItem.amount?.value,
      notificationItem.amount?.currency,
      notificationItem.eventCode,
      notificationItem.success,
    ].join(':')

    const key = Buffer.from(hmacKey, 'hex')
    const expectedSignature = crypto
      .createHmac('sha256', key)
      .update(payload)
      .digest('base64')

    return hmacSignature === expectedSignature
  } catch (error) {
    adyenLog.error('HMAC verification threw', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

async function createBookingFromPending(
  reference: string,
  pspReference: string
) {
  const supabase = createAdminClient()

  // 1. Check if booking already exists or is being processed
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('apaleo_booking_id, status')
    .eq('transaction_reference', pspReference)
    .single()

  if (existingBooking) {
    if (existingBooking.status === 'completed') {
      bookingLog.info('webhook: booking already completed', { apaleoBookingId: existingBooking.apaleo_booking_id })
      return { alreadyExists: true, bookingId: existingBooking.apaleo_booking_id }
    }
    if (existingBooking.status === 'processing') {
      bookingLog.info('webhook: booking processing — skipping', { pspReference })
      return { alreadyProcessing: true }
    }
  }

  // 2. Get pending booking payload
  const { data: pendingBooking, error: pendingError } = await supabase
    .from('pending_bookings')
    .select('booking_payload, status')
    .eq('reference', reference)
    .single()

  if (pendingError || !pendingBooking) {
    bookingLog.info('webhook: no pending booking found — client likely handled it', { reference })
    return { noPending: true }
  }

  if (pendingBooking.status === 'completed') {
    bookingLog.info('webhook: pending booking already completed', { reference })
    return { alreadyExists: true }
  }

  // 3. Acquire lock — insert with status 'processing'
  const { error: lockError } = await supabase.from('bookings').insert({
    transaction_reference: pspReference,
    status: 'processing',
    user_id: null,
    created_at: new Date().toISOString(),
  })

  if (lockError) {
    if (lockError.code === '23505') {
      bookingLog.info('webhook: lock taken by another process — skipping', { pspReference })
      return { alreadyProcessing: true }
    }
    // Non-conflict lock error — proceed anyway so we don't drop a paid booking.
    bookingLog.error('webhook: lock insert failed — proceeding without lock', { error: lockError })
  }

  // 4. Create booking in Apaleo. Spread to avoid mutating the cached payload.
  const booking = {
    ...pendingBooking.booking_payload,
    transactionReference: pspReference,
  }

  apaleoLog.info('webhook → Apaleo POST /bookings', {
    reference,
    pspReference,
    totalAmount: booking.totalAmount,
    reservationsCount: booking.reservations?.length,
    reservations: booking.reservations?.map((r: any) => ({
      adults: r.adults,
      prepayment: r.prepaymentAmount?.amount,
      timeSlicesCount: r.timeSlices?.length,
      ratePlanId: r.timeSlices?.[0]?.ratePlanId,
      servicesCount: r.services?.length,
    })),
  })

  const token = await getOrRefreshToken()

  const response = await fetch(`${APALEO_API_URL}/booking/v1/bookings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(booking),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    bookingLog.error('webhook: Apaleo POST /bookings failed', {
      pspReference,
      status: response.status,
      error: errorData,
    })

    await supabase
      .from('bookings')
      .update({ status: 'failed' })
      .eq('transaction_reference', pspReference)
      .eq('status', 'processing')

    await supabase
      .from('pending_bookings')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('reference', reference)

    bookingLog.warn('webhook: initiating reversal — payment charged but booking never created', { pspReference })
    await reversePayment(pspReference, { internalReference: reference })

    return { error: 'Failed to create booking', details: errorData }
  }

  const apaleoData = await response.json()
  const apaleoReservationIds: string[] = apaleoData.reservationIds?.map((r: any) => r.id) || []
  apaleoLog.success('webhook: booking created', {
    id: apaleoData.id,
    reservationIds: apaleoReservationIds,
  })

  // Track PAs at outer scope so the cleanup helper sees them even if the
  // post-booking block throws.
  let paymentAccountIds: string[] = []

  const cleanup = async () => {
    bookingLog.error('webhook cleanup initiated', {
      pspReference,
      apaleoBookingId: apaleoData.id,
      reservationIds: apaleoReservationIds,
      paymentAccountIds,
    })

    await Promise.allSettled(apaleoReservationIds.map((id: string) => cancelReservation(id)))

    await reversePayment(pspReference, {
      apaleoPaymentAccountIds: paymentAccountIds,
      internalReference: reference,
    })

    await supabase
      .from('bookings')
      .update({ status: 'failed' })
      .eq('transaction_reference', pspReference)
    await supabase
      .from('pending_bookings')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('reference', reference)
  }

  // Apaleo returned a booking without reservations — impossible per spec, but
  // a defensive guard against silent success with zero PAs/captures.
  if (apaleoReservationIds.length === 0) {
    bookingLog.error('webhook: Apaleo returned no reservation IDs — rolling back', {
      apaleoBookingId: apaleoData.id,
    })
    await cleanup()
    return { error: 'Apaleo returned a booking without reservation IDs' }
  }

  // Atomic post-booking block: any throw → cleanup + structured error return.
  try {
    // 5. Persist Apaleo IDs but keep status='processing' until all captures land.
    await supabase
      .from('bookings')
      .update({
        apaleo_booking_id: apaleoData.id,
        reservation_ids: apaleoReservationIds,
      })
      .eq('transaction_reference', pspReference)

    // 6. Resume from any state persisted by a previous attempt so retries don't
    // double-register PAs.
    const { data: existing } = await supabase
      .from('bookings')
      .select('apaleo_payment_account_ids')
      .eq('transaction_reference', pspReference)
      .maybeSingle()
    paymentAccountIds = existing?.apaleo_payment_account_ids ?? []

    // 7. For each reservation, register the Adyen authorization as a
    // per-reservation Apaleo Payment Account.
    bookingLog.info('webhook: STEP 7 — Apaleo payment accounts (per reservation)', {
      apaleoBookingId: apaleoData.id,
      pspReference,
      reservationCount: apaleoReservationIds.length,
      reusing: paymentAccountIds.length,
    })
    for (let i = paymentAccountIds.length; i < apaleoReservationIds.length; i++) {
      const reservationId = apaleoReservationIds[i]
      const paymentAccountId = await createPaymentAccount({
        reservationId,
        pspReference,
      })
      paymentAccountIds.push(paymentAccountId)
      await supabase
        .from('bookings')
        .update({ apaleo_payment_account_ids: paymentAccountIds })
        .eq('transaction_reference', pspReference)
    }

    // 8. Capture each reservation folio via its Payment Account.
    bookingLog.info('webhook: STEP 8 — folio captures via payment account', {
      pspReference,
      reservationCount: apaleoReservationIds.length,
    })
    for (let i = 0; i < apaleoReservationIds.length; i++) {
      const reservationId = apaleoReservationIds[i]
      const paymentAccountId = paymentAccountIds[i]
      const reservation = booking.reservations[i]
      const amount = reservation?.prepaymentAmount?.amount
      const currency = reservation?.prepaymentAmount?.currency || 'EUR'

      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error(`webhook: reservation ${i + 1} (${reservationId}) has no prepayment amount`)
      }

      const folioResult = await payFolioByPaymentAccount({
        reservationId,
        paymentAccountId,
        amount,
        currency,
      })

      if (!folioResult.success) {
        throw new Error(`webhook: folio capture failed for reservation ${reservationId}: ${folioResult.error}`)
      }
    }

    // 9. All captures succeeded — flip to completed.
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('transaction_reference', pspReference)
    await supabase
      .from('pending_bookings')
      .update({
        status: 'completed',
        apaleo_booking_id: apaleoData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)

    return { success: true, bookingId: apaleoData.id }
  } catch (postBookingError) {
    bookingLog.error('webhook: post-booking flow failed — running cleanup', {
      apaleoBookingId: apaleoData.id,
      paymentAccountCount: paymentAccountIds.length,
      error: postBookingError instanceof Error ? postBookingError.message : String(postBookingError),
    })
    await cleanup()
    return {
      error: 'Booking rolled back — payment refunded',
      details: postBookingError instanceof Error ? postBookingError.message : 'Unknown error',
    }
  }
}

// Late-services flow: a separate Adyen authorization may target a single
// existing reservation to add extras after the initial booking. The CharlieM
// `pending_services` schema uses `lock_key` + `transaction_reference` +
// `services_payload` (see migration 14_pending_services_update.sql).
async function bookServicesFromPending(
  reference: string,
  pspReference: string
) {
  const supabase = createAdminClient()

  const { data: pendingServices, error: pendingError } = await supabase
    .from('pending_services')
    .select('reservation_id, services_payload, status, lock_key')
    .eq('transaction_reference', reference)
    .maybeSingle()

  if (pendingError || !pendingServices) {
    folioLog.info('webhook: no pending services found', { reference })
    return { notFound: true }
  }

  if (pendingServices.status === 'completed') {
    folioLog.info('webhook: services already booked', { reference })
    return { alreadyExists: true }
  }

  try {
    const result = await bookReservationServicesLegacy(
      pendingServices.reservation_id,
      pendingServices.services_payload || [],
      pspReference
    )

    const failedServices = result.services.filter((r: any) => !r.success)
    if (failedServices.length > 0 || (result.payment && !result.payment.success)) {
      folioLog.error('webhook: services failed', { failedServices, payment: result.payment })
      await supabase.from('pending_services')
        .update({
          status: 'failed',
          error_details: JSON.stringify({ failedServices, payment: result.payment }),
        })
        .eq('lock_key', pendingServices.lock_key)
      return { error: 'Services failed', details: failedServices }
    }

    await supabase.from('pending_services')
      .update({ status: 'completed' })
      .eq('lock_key', pendingServices.lock_key)

    folioLog.success('webhook: services booked', { reservationId: pendingServices.reservation_id })
    return { success: true }
  } catch (err) {
    folioLog.error('webhook: services threw', {
      reservationId: pendingServices.reservation_id,
      error: err instanceof Error ? err.message : String(err),
    })
    await supabase.from('pending_services')
      .update({
        status: 'failed',
        error_details: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      })
      .eq('lock_key', pendingServices.lock_key)
    return { error: 'Services error', details: err }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const notificationItems = body.notificationItems || []

    for (const item of notificationItems) {
      const notification = item.NotificationRequestItem

      if (!verifyHmacSignature(notification, ADYEN_HMAC_KEY)) {
        adyenLog.error('webhook: invalid HMAC signature')
        continue
      }

      const { eventCode, success, merchantReference, pspReference } = notification

      adyenLog.info('webhook received', {
        eventCode,
        success,
        amountEUR: notification.amount ? notification.amount.value / 100 : null,
        amountCents: notification.amount?.value,
        merchantReference,
        pspReference,
      })

      // We only act on successful authorisations; other event codes (CANCEL,
      // REFUND, etc.) arrive but reach no business logic yet.
      if (eventCode === 'AUTHORISATION' && success === 'true') {
        try {
          const result = await createBookingFromPending(merchantReference, pspReference)
          if (result.alreadyExists) { bookingLog.info('webhook: booking already exists', { bookingId: result.bookingId }); continue }
          if (result.alreadyProcessing) { bookingLog.info('webhook: booking already processing'); continue }
          if (result.error) { bookingLog.error('webhook: booking failed', { reference: merchantReference, error: result.error }) }
          else if (result.success) { bookingLog.success('webhook: booking created', { bookingId: result.bookingId }); continue }
        } catch (error: any) {
          bookingLog.error('webhook: booking threw', { reference: merchantReference, error: error.message })
        }

        // Fallback: no booking — assume payment was for a late-services add.
        try {
          const result = await bookServicesFromPending(merchantReference, pspReference)
          if (result.notFound) folioLog.info('webhook: no pending services', { reference: merchantReference })
          else if (result.alreadyExists) folioLog.info('webhook: services already booked', { reference: merchantReference })
          else if (result.error) folioLog.error('webhook: services failed', { reference: merchantReference })
          else folioLog.success('webhook: services booked', { reference: merchantReference })
        } catch (error: any) {
          folioLog.error('webhook: services threw', { reference: merchantReference, error: error.message })
        }
      }
    }

    // Adyen requires a plaintext [accepted] response on every delivery.
    return new NextResponse('[accepted]', { status: 200 })
  } catch (error) {
    adyenLog.error('webhook: unhandled exception', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse('[accepted]', { status: 200 })
  }
}
