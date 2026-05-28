import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getOrRefreshToken } from "@/services/Request"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"
import { Booking } from "@/types/booking"
import { bookingLog, apaleoLog } from "@/lib/logger"
import { reversePayment } from "@/app/actions/adyen/reversePayment"
import { createPaymentAccount } from "@/services/apaleo/createPaymentAccount"
import { cancelPaymentAccount } from "@/services/apaleo/cancelPaymentAccount"
import { cancelReservation } from "@/services/apaleo/cancelReservation"
import { payFolioByPaymentAccount } from "@/services/bookReservationServices"
import { HOTEL_INFO } from "@/lib/Constants"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

// DB writes go through service_role to bypass RLS on bookings/pending_bookings
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

dayjs.extend(utc)
dayjs.extend(timezone)

const APALEO_API_URL = 'https://api.apaleo.com'

interface ApaleoBookingResponse {
  id: string
  reservationIds: { id: string }[]
}

const isRetriableError = (status: number): boolean => status >= 500 && status <= 504
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function createApaleoBookingWithRetry(
  bookingPayload: any,
  token: string,
  maxAttempts: number = 3
): Promise<{ success: boolean; data?: ApaleoBookingResponse; error?: any; status?: number }> {
  let lastError: any = null
  let lastStatus: number = 500

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const delayMs = Math.pow(2, attempt - 1) * 1000
        apaleoLog.warn('POST /bookings retry', { attempt: `${attempt}/${maxAttempts}`, delayMs })
        await delay(delayMs)
      } else {
        apaleoLog.info('POST /bookings', { attempt: `${attempt}/${maxAttempts}` })
      }

      const response = await fetch(`${APALEO_API_URL}/booking/v1/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        lastStatus = response.status
        lastError = errorData

        apaleoLog.error('POST /bookings failed', {
          attempt: `${attempt}/${maxAttempts}`,
          status: response.status,
          error: errorData,
        })

        if (isRetriableError(response.status) && attempt < maxAttempts) {
          continue
        }

        return {
          success: false,
          error: errorData,
          status: response.status,
        }
      }

      const apaleoData: ApaleoBookingResponse = await response.json()
      apaleoLog.success('booking created', {
        id: apaleoData.id,
        reservationIds: apaleoData.reservationIds?.map(r => r.id),
      })

      return {
        success: true,
        data: apaleoData
      }
    } catch (error) {
      lastError = error
      apaleoLog.error('POST /bookings threw', {
        attempt: `${attempt}/${maxAttempts}`,
        error: error instanceof Error ? error.message : String(error),
      })

      if (attempt < maxAttempts) {
        continue
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      }
    }
  }

  return {
    success: false,
    error: lastError,
    status: lastStatus
  }
}

export async function POST(request: Request) {
  // Hoisted so the outer catch can log it for post-mortem correlation.
  // Stays `undefined` if the throw happens before we read the body. The
  // narrowed `const pspReference` inside the try block is used everywhere
  // else; this mirror exists only for the catch log.
  let pspReferenceForCatchLog: string | undefined
  try {
    const booking: Booking = await request.json()
    bookingLog.info('STEP 5 — /bookings/create entered', {
      pspReference: booking.transactionReference,
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

    // Hoisted PSP guard: every downstream step assumes pspReference exists
    // (DB lock by transaction_reference, Adyen refund on failure, idempotency
    // reads). Without it we'd risk creating an Apaleo booking we couldn't
    // refund or roll back.
    if (!booking.transactionReference) {
      bookingLog.error('missing transactionReference — refusing to create booking')
      return NextResponse.json(
        { error: 'Missing transaction reference' },
        { status: 400 }
      )
    }
    const pspReference = booking.transactionReference
    pspReferenceForCatchLog = pspReference

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const supabaseAdmin = createAdminClient()

    // Step 1: Acquire lock by inserting into bookings table. If another
    // process (webhook or duplicate request) already inserted, the unique
    // constraint fires and we know the booking is being handled.
    {
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('apaleo_booking_id, reservation_ids, status')
        .eq('transaction_reference', pspReference)
        .single()

      if (existingBooking) {
        if (existingBooking.status === 'completed') {
          bookingLog.info('booking already completed — short-circuit', {
            apaleoBookingId: existingBooking.apaleo_booking_id,
          })
          return NextResponse.json(
            {
              id: existingBooking.apaleo_booking_id,
              reservationIds: existingBooking.reservation_ids || [],
              alreadyExists: true,
              message: 'Booking already created for this payment'
            },
            { status: 200 }
          )
        }

        if (existingBooking.status === 'processing') {
          bookingLog.info('booking already processing — duplicate request', { pspReference })
          return NextResponse.json(
            {
              message: 'Booking is being processed. Please wait.',
              alreadyProcessing: true
            },
            { status: 202 }
          )
        }

        if (existingBooking.status === 'failed') {
          // Previous attempt already failed and the refund (success or manual)
          // ran. Returning 202 here would trap the client in an "in progress"
          // state forever. Surface the failure explicitly with `pspReference`
          // so support can correlate.
          bookingLog.warn('booking already marked failed — refusing retry', { pspReference })
          return NextResponse.json(
            {
              error: 'BookingPreviouslyFailed',
              message: `A previous attempt for this payment was rolled back. Please contact support and quote reference: ${pspReference}.`,
              pspReference,
            },
            { status: 410 }
          )
        }
      }

      const { error: lockError } = await supabaseAdmin.from('bookings').insert({
        transaction_reference: pspReference,
        status: 'processing',
        user_id: user?.id || null,
        created_at: new Date().toISOString(),
      })

      if (lockError) {
        if (lockError.code === '23505') {
          bookingLog.info('lock taken by concurrent process — checking status', { pspReference })
          const { data: raceBooking } = await supabase
            .from('bookings')
            .select('apaleo_booking_id, reservation_ids, status')
            .eq('transaction_reference', pspReference)
            .single()

          if (raceBooking?.status === 'completed' && raceBooking.apaleo_booking_id) {
            return NextResponse.json(
              {
                id: raceBooking.apaleo_booking_id,
                reservationIds: raceBooking.reservation_ids || [],
                alreadyExists: true,
              },
              { status: 200 }
            )
          }

          if (raceBooking?.status === 'failed') {
            bookingLog.warn('race-fetched booking marked failed — refusing retry', { pspReference })
            return NextResponse.json(
              {
                error: 'BookingPreviouslyFailed',
                message: `A previous attempt for this payment was rolled back. Please contact support and quote reference: ${pspReference}.`,
                pspReference,
              },
              { status: 410 }
            )
          }

          return NextResponse.json(
            { message: 'Booking is being processed by another request.', alreadyProcessing: true },
            { status: 202 }
          )
        }

        // Lock insert failed for a non-conflict reason — proceed anyway so we
        // don't drop a paid booking. Subsequent UPDATEs will no-op on the
        // missing row but the Apaleo state will still be created.
        bookingLog.error('lock insert failed — proceeding without lock', { error: lockError })
      }
    }

    // Step 1.5: Source the trusted reservation breakdown from the server-
    // stored pending payload, not the request body. validatePaymentAmount
    // already confirmed the pending row matches the Adyen authorization in
    // aggregate, so it is the trusted source. The body's per-reservation
    // prepaymentAmount and ratePlanId are otherwise unverified — a crafted
    // request could under-capture from the authorization (passing the
    // aggregate cent check while letting folio capture grab less).
    type FailTrustedReason =
      | 'pending_query_failed'
      | 'pending_missing'
      | 'pending_cleared'
      | 'pending_invalid'
    const failTrustedSource = async (code: FailTrustedReason, internalDetail: string) => {
      bookingLog.error('trusted pending payload unavailable — refunding', {
        pspReference,
        code,
        internalDetail,
      })
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'failed' })
        .eq('transaction_reference', pspReference)
        .eq('status', 'processing')
      // Best-effort: also mark pending_bookings failed so consistency
      // dashboards don't surface this row as stuck. No-ops if missing.
      await supabaseAdmin
        .from('pending_bookings')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('reference', pspReference)
      const reversal = await reversePayment(pspReference)
      if (!reversal.success) {
        bookingLog.error('trusted-source fail — refund did not complete, manual action required', {
          pspReference,
          code,
          refundError: reversal.error,
        })
        return NextResponse.json(
          {
            error: 'BookingFailedRefundFailed',
            message: `Booking could not be completed and the refund did not complete. Please contact support and quote reference: ${pspReference}.`,
            code,
            pspReference,
          },
          { status: 503 },
        )
      }
      return NextResponse.json(
        {
          error: 'TrustedPayloadUnavailable',
          message: 'Cannot complete booking — payment refunded.',
          code,
        },
        { status: 503 },
      )
    }

    const { data: pendingRow, error: pendingErr } = await supabaseAdmin
      .from('pending_bookings')
      .select('booking_payload')
      .eq('reference', pspReference)
      .maybeSingle()

    if (pendingErr) {
      return await failTrustedSource('pending_query_failed', `pending_bookings query failed: ${pendingErr.message}`)
    }
    if (!pendingRow?.booking_payload) {
      return await failTrustedSource('pending_missing', 'no pending_bookings row')
    }
    const stored = pendingRow.booking_payload as Booking | { cleared: true }
    if ('cleared' in stored && stored.cleared) {
      return await failTrustedSource('pending_cleared', 'pending payload cleared (GDPR delete)')
    }
    const trustedBooking = stored as Booking
    if (!Array.isArray(trustedBooking.reservations) || trustedBooking.reservations.length === 0) {
      return await failTrustedSource('pending_invalid', 'pending payload has no reservations')
    }

    // Replace the request body's reservations with the server-stored,
    // validator-approved breakdown. All downstream code (Apaleo POST,
    // payment account creation, folio capture) reads `booking.reservations`
    // — it now sees the trusted values, not whatever the client posted.
    booking.reservations = trustedBooking.reservations

    // Step 2: Create booking in Apaleo
    const token = await getOrRefreshToken()

    // Guard: if arrival check-in datetime (arrival date at the hotel check-in
    // hour, Berlin time) is in the past, shift it to now + 5 minutes.
    const now = new Date()

    // Returns Berlin UTC offset in ms (e.g. UTC+2 → +7200000)
    const getBerlinOffsetMs = (date: Date): number => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Berlin',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).formatToParts(date)
      const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
      const berlinMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
      return berlinMs - date.getTime()
    }

    const HOTEL_CHECKIN_HOUR = parseInt(HOTEL_INFO.checkinTime.split(':')[0])
    const berlinOffsetMs = getBerlinOffsetMs(now)

    const adjustedReservations = booking.reservations.map(reservation => {
      const arrivalDateStr = reservation.arrival.slice(0, 10)
      const arrivalCheckinUTC = new Date(`${arrivalDateStr}T${String(HOTEL_CHECKIN_HOUR).padStart(2, '0')}:00:00Z`).getTime() - berlinOffsetMs
      const arrivalCheckin = new Date(arrivalCheckinUTC)

      if (arrivalCheckin < now) {
        const corrected = dayjs(now).add(5, 'minute').tz('Europe/Berlin').format()
        bookingLog.warn('arrival check-in in the past — correcting', {
          arrivalDate: arrivalDateStr,
          hotelCheckinHour: HOTEL_CHECKIN_HOUR,
          corrected,
        })
        return { ...reservation, arrival: corrected }
      }

      return reservation
    })

    const bookingPayload = {
      ...booking,
      reservations: adjustedReservations,
    }

    bookingLog.info('STEP 6 — POST Apaleo /bookings', {
      pspReference,
      reservationsCount: bookingPayload.reservations.length,
    })
    const result = await createApaleoBookingWithRetry(bookingPayload, token, 3)

    if (!result.success) {
      bookingLog.error('all booking attempts failed', { pspReference, status: result.status })

      await supabaseAdmin
        .from('bookings')
        .update({ status: 'failed' })
        .eq('transaction_reference', pspReference)
        .eq('status', 'processing')

      bookingLog.warn('initiating reversal — payment charged but booking never created', { pspReference })
      const reversal = await reversePayment(pspReference)
      if (!reversal.success) {
        bookingLog.error('apaleo book failed and refund did not complete — manual action required', {
          pspReference,
          apaleoStatus: result.status,
          refundError: reversal.error,
        })
        return NextResponse.json(
          {
            error: 'BookingFailedRefundFailed',
            message: `Booking could not be completed and the refund did not complete. Please contact support and quote reference: ${pspReference}.`,
            details: result.error,
            pspReference,
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        {
          error: 'Failed to create booking after multiple attempts',
          details: result.error,
          status: result.status,
        },
        { status: result.status || 500 }
      )
    }

    const apaleoData = result.data!
    const apaleoReservationIds = apaleoData.reservationIds.map(r => r.id)

    // Track PAs at outer scope so the cleanup helper sees them even if the
    // post-booking block throws.
    let paymentAccountIds: string[] = []

    // Idempotent cleanup: cancel reservations, cancel created PAs, refund Adyen.
    // Returns `reversalOk` so the caller can phrase the response correctly:
    // refund-failure means the customer is still charged and must contact
    // support, not "rolled back — payment refunded".
    const cleanupFailedBooking = async (): Promise<{ reversalOk: boolean }> => {
      bookingLog.error('cleanup initiated', {
        pspReference,
        apaleoBookingId: apaleoData.id,
        reservationIds: apaleoReservationIds,
        paymentAccountIds,
      })

      const cancelResults = await Promise.allSettled(
        apaleoReservationIds.map(id => cancelReservation(id))
      )
      cancelResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          bookingLog.error('reservation cancel threw', {
            reservationId: apaleoReservationIds[i],
            error: String(r.reason),
          })
        }
      })

      const reversal = await reversePayment(pspReference, {
        apaleoPaymentAccountIds: paymentAccountIds,
      })
      if (!reversal.success) {
        bookingLog.error('post-booking cleanup — refund did not complete, manual action required', {
          pspReference,
          apaleoBookingId: apaleoData.id,
          paymentAccountIds,
          refundError: reversal.error,
        })
      }

      await supabaseAdmin
        .from('bookings')
        .update({ status: 'failed' })
        .eq('transaction_reference', pspReference)

      await supabaseAdmin
        .from('pending_bookings')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('reference', pspReference)

      return { reversalOk: reversal.success }
    }

    // Atomic post-booking block: any throw → cleanup + 502. No partial state
    // can escape to the outer catch unrolled, no money sits charged without
    // a recorded outcome on the Apaleo side.
    try {
      // Step 3: persist Apaleo IDs; status stays 'processing' until all
      // PAs + captures land.
      await supabaseAdmin
        .from('bookings')
        .update({
          apaleo_booking_id: apaleoData.id,
          reservation_ids: apaleoReservationIds,
        })
        .eq('transaction_reference', pspReference)

      // Step 4: resume from any state persisted by a previous attempt so
      // retries (client, webhook fallback, or both) don't double-register PAs.
      const { data: existing } = await supabaseAdmin
        .from('bookings')
        .select('apaleo_payment_account_ids')
        .eq('transaction_reference', pspReference)
        .maybeSingle()
      paymentAccountIds = existing?.apaleo_payment_account_ids ?? []

      // Step 5: for each reservation, register the Adyen authorization as a
      // per-reservation Apaleo Payment Account.
      bookingLog.info('STEP 7 — Apaleo payment accounts (per reservation)', {
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
        await supabaseAdmin
          .from('bookings')
          .update({ apaleo_payment_account_ids: paymentAccountIds })
          .eq('transaction_reference', pspReference)
      }

      // Step 6: capture each reservation folio via its Payment Account.
      // Skip is the expected path when Apaleo Pay has auto-distributed funds.
      bookingLog.info('STEP 8 — folio captures via payment account', {
        pspReference,
        reservationCount: apaleoReservationIds.length,
      })
      for (let i = 0; i < apaleoReservationIds.length; i++) {
        const reservationId = apaleoReservationIds[i]
        const paymentAccountId = paymentAccountIds[i]
        const reservation = booking.reservations[i]
        const amount = reservation?.prepaymentAmount?.amount

        if (typeof amount !== 'number' || amount <= 0) {
          throw new Error(`Reservation ${i + 1} (${reservationId}) has no prepayment amount`)
        }

        const currency = reservation.prepaymentAmount?.currency || 'EUR'
        const folioResult = await payFolioByPaymentAccount({
          reservationId,
          paymentAccountId,
          amount,
          currency,
        })

        if (!folioResult.success) {
          throw new Error(`Folio capture failed for reservation ${reservationId}: ${folioResult.error}`)
        }
      }

      // Step 7: all captures succeeded — flip status to 'completed'.
      bookingLog.success('STEP 9 — booking completed', {
        apaleoBookingId: apaleoData.id,
        paymentAccountIds,
        reservationIds: apaleoReservationIds,
        pspReference,
      })
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'completed' })
        .eq('transaction_reference', pspReference)
    } catch (postBookingError) {
      bookingLog.error('post-booking flow failed — running cleanup', {
        apaleoBookingId: apaleoData.id,
        paymentAccountCount: paymentAccountIds.length,
        error: postBookingError instanceof Error ? postBookingError.message : String(postBookingError),
      })
      const cleanup = await cleanupFailedBooking()
      if (!cleanup.reversalOk) {
        return NextResponse.json(
          {
            error: 'BookingFailedRefundFailed',
            message: `Booking could not be completed and the refund did not complete. Please contact support and quote reference: ${pspReference}.`,
            details: postBookingError instanceof Error ? postBookingError.message : 'Unknown error',
            pspReference,
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        {
          error: 'Booking rolled back — payment refunded',
          details: postBookingError instanceof Error ? postBookingError.message : 'Unknown error',
        },
        { status: 502 }
      )
    }

    // Booking is complete and money is captured. The two side-effects below
    // are best-effort — a failure here doesn't roll back the booking.

    try {
      if (booking.consent && apaleoData.id) {
        const headersList = await headers()
        const ip =
          headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          headersList.get('x-real-ip') ||
          'unknown'

        await supabase.from('consents').insert({
          user_id: user?.id || null,
          booking_id: apaleoData.id,
          consent_type: 'booking',
          consent_given: true,
          ip_address: ip,
          privacy_policy_version: '1.0',
          consent_date: new Date().toISOString(),
        })
      }
    } catch (supabaseError) {
      bookingLog.error('failed to save consent', {
        apaleoBookingId: apaleoData.id,
        error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
      })
    }

    try {
      await supabaseAdmin
        .from('pending_bookings')
        .update({ status: 'completed', apaleo_booking_id: apaleoData.id, updated_at: new Date().toISOString() })
        .eq('reference', pspReference)
    } catch {
      // Non-critical.
    }

    return NextResponse.json(
      {
        ...apaleoData,
        reservationIds: apaleoReservationIds,
      },
      { status: 201 }
    )

  } catch (error) {
    bookingLog.error('create booking — unhandled exception', {
      pspReference: pspReferenceForCatchLog,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
