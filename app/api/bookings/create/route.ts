import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getOrRefreshToken } from "@/services/Request"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"
import { Booking } from "@/types/booking"
import { bookReservationServices } from "@/services/bookReservationServices"
import { bookingLog, apaleoLog } from "@/lib/logger"
import { reversePayment } from "@/app/actions/adyen/reversePayment"
import { createBookingAuthorization } from "@/services/apaleo/createBookingAuthorization"
import { cancelReservation } from "@/services/apaleo/cancelReservation"
import { HOTEL_INFO } from "@/lib/Constants"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

// DB writes go through service_role to bypass RLS on bookings/pending_bookings.
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
): Promise<{ success: boolean; data?: ApaleoBookingResponse; error?: any; status?: number; roomUnavailable?: boolean }> {
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

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const supabaseAdmin = createAdminClient()

    // Step 1: Acquire lock by inserting into bookings table FIRST.
    // If another process (webhook or duplicate request) already inserted, unique
    // constraint fails → we know booking is being handled.
    if (booking.transactionReference) {
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('apaleo_booking_id, reservation_ids, status')
        .eq('transaction_reference', booking.transactionReference)
        .single()

      if (existingBooking) {
        if (existingBooking.status === 'completed') {
          bookingLog.info('booking already completed', { apaleoBookingId: existingBooking.apaleo_booking_id })
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
          bookingLog.info('booking already processing — duplicate request', {
            pspReference: booking.transactionReference,
          })
          return NextResponse.json(
            {
              message: 'Booking is being processed. Please wait.',
              alreadyProcessing: true
            },
            { status: 202 }
          )
        }
      }

      const { error: lockError } = await supabaseAdmin.from('bookings').insert({
        transaction_reference: booking.transactionReference,
        status: 'processing',
        user_id: user?.id || null,
        created_at: new Date().toISOString(),
      })

      if (lockError) {
        if (lockError.code === '23505') {
          bookingLog.info('lock taken by concurrent process — checking status', {
            pspReference: booking.transactionReference,
          })
          const { data: raceBooking } = await supabase
            .from('bookings')
            .select('apaleo_booking_id, reservation_ids, status')
            .eq('transaction_reference', booking.transactionReference)
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

          return NextResponse.json(
            { message: 'Booking is being processed by another request.', alreadyProcessing: true },
            { status: 202 }
          )
        }

        // Lock insert failed for a non-conflict reason — proceed anyway so we
        // don't drop a paid booking.
        bookingLog.error('lock insert failed — proceeding without lock', { error: lockError })
      }
    }

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
      pspReference: booking.transactionReference,
      reservationsCount: bookingPayload.reservations.length,
    })
    const result = await createApaleoBookingWithRetry(bookingPayload, token, 3)

    if (!result.success) {
      bookingLog.error('all booking attempts failed', {
        pspReference: booking.transactionReference,
        status: result.status,
      })

      if (booking.transactionReference) {
        await supabaseAdmin
          .from('bookings')
          .update({ status: 'failed' })
          .eq('transaction_reference', booking.transactionReference)
          .eq('status', 'processing')

        bookingLog.warn('initiating reversal — payment charged but booking never created', {
          pspReference: booking.transactionReference,
        })
        await reversePayment(booking.transactionReference)
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

    // Step 3: Persist Apaleo booking IDs but keep status='processing' — we
    // only flip to 'completed' after the Apaleo authorization is registered
    // and all folio captures succeed.
    if (booking.transactionReference) {
      await supabaseAdmin
        .from('bookings')
        .update({
          apaleo_booking_id: apaleoData.id,
          reservation_ids: apaleoReservationIds,
        })
        .eq('transaction_reference', booking.transactionReference)
    }

    // Idempotent rollback used in every post-booking failure path: cancel the
    // booking-level Apaleo authorization (if created), cancel all reservations,
    // then Adyen refund. Best-effort throughout — money returns to the guest
    // even if the Apaleo side has hiccups.
    const cleanupFailedBooking = async (apaleoAuthorizationId: string | null) => {
      bookingLog.error('cleanup initiated', {
        transactionReference: booking.transactionReference,
        apaleoBookingId: apaleoData.id,
        reservationIds: apaleoReservationIds,
        apaleoAuthorizationId,
      })

      // Cancel reservations (best-effort, parallel). Apaleo has no
      // booking-level cancel — we iterate over reservations.
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

      if (booking.transactionReference) {
        await reversePayment(booking.transactionReference, {
          apaleoAuthorizationIds: apaleoAuthorizationId ? [apaleoAuthorizationId] : [],
        })

        await supabaseAdmin
          .from('bookings')
          .update({ status: 'failed' })
          .eq('transaction_reference', booking.transactionReference)

        await supabaseAdmin
          .from('pending_bookings')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('reference', booking.transactionReference)
      }
    }

    // Step 4: Read any state persisted by a previous (failed/partial) attempt
    // so we can resume idempotently under retry (client, webhook fallback, or both).
    let apaleoAuthorizationId: string | null = null
    if (booking.transactionReference) {
      const { data: existing } = await supabaseAdmin
        .from('bookings')
        .select('apaleo_authorization_id')
        .eq('transaction_reference', booking.transactionReference)
        .maybeSingle()
      apaleoAuthorizationId = existing?.apaleo_authorization_id ?? null
    }

    // Step 5: Register the Adyen pre-auth with Apaleo as a booking-level
    // authorization. A single booking-level auth covers all reservation
    // folios in the booking (per Apaleo docs), so one ID drives every capture.
    bookingLog.info('STEP 7 — Apaleo booking authorization', {
      apaleoBookingId: apaleoData.id,
      pspReference: booking.transactionReference,
      reusing: !!apaleoAuthorizationId,
    })
    if (!apaleoAuthorizationId) {
      if (!booking.transactionReference) {
        bookingLog.error('missing transactionReference — cannot create booking authorization')
        return NextResponse.json(
          { error: 'Missing transaction reference' },
          { status: 400 }
        )
      }
      const totalPrepayment = booking.reservations.reduce(
        (sum, r) => sum + (r.prepaymentAmount?.amount ?? 0),
        0,
      )
      const currency = booking.reservations[0]?.prepaymentAmount?.currency ?? 'EUR'
      if (totalPrepayment <= 0) {
        bookingLog.error('total prepayment is 0 — cannot create authorization', {
          pspReference: booking.transactionReference,
        })
        await cleanupFailedBooking(null)
        return NextResponse.json(
          { error: 'Reservations have no prepayment amount' },
          { status: 400 }
        )
      }
      try {
        apaleoAuthorizationId = await createBookingAuthorization({
          bookingId: apaleoData.id,
          propertyId: process.env.APALEO_PROPERTY_ID!,
          pspReference: booking.transactionReference,
          amount: { amount: totalPrepayment, currency },
        })
        await supabaseAdmin
          .from('bookings')
          .update({ apaleo_authorization_id: apaleoAuthorizationId })
          .eq('transaction_reference', booking.transactionReference)
      } catch (error) {
        bookingLog.error('booking authorization creation failed — rolling back', {
          error: error instanceof Error ? error.message : String(error),
        })
        await cleanupFailedBooking(null)
        return NextResponse.json(
          {
            error: 'Failed to register authorization with Apaleo — booking rolled back, payment refunded',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 502 }
        )
      }
    }

    // Step 6: Capture each reservation's folio using the booking-level
    // authorization. Partial captures from the same auth distribute the
    // single prepay charge across the folios.
    bookingLog.info('STEP 8 — folio captures starting', {
      pspReference: booking.transactionReference,
      apaleoAuthorizationId,
      reservationCount: apaleoReservationIds.length,
    })
    for (let i = 0; i < apaleoReservationIds.length; i++) {
      const reservationId = apaleoReservationIds[i]
      const reservation = booking.reservations[i]
      const amount = reservation?.prepaymentAmount?.amount

      if (!reservationId) {
        bookingLog.error('missing reservationId at index — aborting', { index: i })
        await cleanupFailedBooking(apaleoAuthorizationId)
        return NextResponse.json(
          { error: 'Apaleo returned a booking without all reservation IDs' },
          { status: 502 }
        )
      }

      if (typeof amount !== 'number' || amount <= 0) {
        bookingLog.error('reservation missing prepaymentAmount.amount — aborting', {
          reservationId,
          amount,
        })
        await cleanupFailedBooking(apaleoAuthorizationId)
        return NextResponse.json(
          { error: `Reservation ${i + 1} has no prepayment amount` },
          { status: 400 }
        )
      }

      const currency = reservation.prepaymentAmount?.currency || 'EUR'

      const folioResult = await bookReservationServices(
        reservationId,
        [],
        apaleoAuthorizationId,
        amount,
        currency,
      )

      if (folioResult.payment && !folioResult.payment.success) {
        bookingLog.error('folio capture failed — rolling back', {
          reservationId,
          index: i,
          error: 'error' in folioResult.payment ? folioResult.payment.error : 'unknown',
        })
        await cleanupFailedBooking(apaleoAuthorizationId)
        return NextResponse.json(
          {
            error: 'Failed to capture folio for a reservation — booking rolled back, payment refunded',
            details: 'error' in folioResult.payment ? folioResult.payment.error : undefined,
            reservationIndex: i,
          },
          { status: 502 }
        )
      }
    }

    // Step 7: All captures succeeded — flip status to 'completed'.
    bookingLog.success('STEP 9 — booking completed', {
      apaleoBookingId: apaleoData.id,
      apaleoAuthorizationId,
      reservationIds: apaleoReservationIds,
      pspReference: booking.transactionReference,
    })
    if (booking.transactionReference) {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'completed' })
        .eq('transaction_reference', booking.transactionReference)
    }

    // Step 8: Save consent
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

    // Step 9: Mark pending booking as completed
    if (booking.transactionReference) {
      try {
        await supabaseAdmin
          .from('pending_bookings')
          .update({ status: 'completed', apaleo_booking_id: apaleoData.id, updated_at: new Date().toISOString() })
          .eq('reference', booking.transactionReference)
      } catch {
        // Non-critical
      }
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
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
