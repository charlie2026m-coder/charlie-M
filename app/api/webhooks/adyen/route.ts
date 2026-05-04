import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOrRefreshToken } from "@/services/Request"
import { bookReservationServices } from "@/services/bookReservationServices"
import { reversePayment } from "@/app/actions/adyen/reversePayment"
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
    console.warn('⚠️ ADYEN_HMAC_KEY not set — skipping HMAC verification (dev mode)')
    return true
  }

  try {
    const hmacSignature = notificationItem.additionalData?.hmacSignature
    if (!hmacSignature) {
      console.error('❌ No HMAC signature in notification')
      return false
    }

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
    const expectedSignature = crypto.createHmac('sha256', key).update(payload).digest('base64')

    return hmacSignature === expectedSignature
  } catch (error) {
    console.error('❌ HMAC verification error:', error)
    return false
  }
}

async function createBookingFromPending(reference: string, pspReference: string) {
  const supabase = createAdminClient()

  console.log(`📞 Webhook: Processing booking for reference ${reference}, pspReference ${pspReference}`)

  // Check if booking already exists
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('apaleo_booking_id, status')
    .eq('transaction_reference', pspReference)
    .single()

  if (existingBooking?.status === 'completed') {
    console.log(`✅ Webhook: Booking already completed for ${pspReference}`)
    return { alreadyExists: true, bookingId: existingBooking.apaleo_booking_id }
  }
  if (existingBooking?.status === 'processing') {
    console.log(`⏳ Webhook: Booking already being processed for ${pspReference}`)
    return { alreadyProcessing: true }
  }

  // Get payload from pending_bookings
  const { data: pendingBooking, error: pendingError } = await supabase
    .from('pending_bookings')
    .select('booking_payload, status')
    .eq('reference', reference)
    .single()

  if (pendingError || !pendingBooking) {
    console.log(`ℹ️ Webhook: No pending booking found for reference ${reference} — client likely handled it`)
    return { noPending: true }
  }

  if (pendingBooking.status === 'completed') {
    console.log(`✅ Webhook: Pending booking already completed for ${reference}`)
    return { alreadyExists: true }
  }

  // Acquire idempotency lock
  const { error: lockError } = await supabase.from('bookings').insert({
    transaction_reference: pspReference,
    status: 'processing',
    user_id: null,
  })

  if (lockError?.code === '23505') {
    console.log(`⚠️ Webhook: Lock already exists for ${pspReference} — another process handling it`)
    return { alreadyProcessing: true }
  }

  if (lockError) {
    console.error(`❌ Webhook: Failed to acquire lock:`, lockError)
    return { error: 'Failed to acquire lock', details: lockError }
  }

  // Create booking in Apaleo
  const booking = pendingBooking.booking_payload
  booking.transactionReference = pspReference

  console.log(`🔄 Webhook: Creating booking in Apaleo...`)

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
    console.error(`❌ Webhook: Apaleo booking failed:`, errorData)

    await supabase.from('bookings')
      .update({ status: 'failed' })
      .eq('transaction_reference', pspReference)
      .eq('status', 'processing')

    await supabase.from('pending_bookings')
      .update({ status: 'failed' })
      .eq('reference', reference)

    // Reverse the payment — customer gets refunded automatically
    console.log(`💸 Webhook: booking failed after charge — initiating reversal | psp: ${pspReference}`)
    await reversePayment(pspReference, reference)

    return { error: 'Failed to create booking', details: errorData }
  }

  const apaleoData = await response.json()
  console.log(`✅ Webhook: Booking created in Apaleo with ID ${apaleoData.id}`)

  // Mark as completed
  await supabase.from('bookings').update({
    apaleo_booking_id: apaleoData.id,
    reservation_ids: apaleoData.reservationIds?.map((r: any) => r.id) || [],
    status: 'completed',
  }).eq('transaction_reference', pspReference)

  // Pay folios
  console.log(`💰 Webhook: Paying folios for ${apaleoData.reservationIds?.length || 0} reservation(s)...`)
  for (const res of (apaleoData.reservationIds || [])) {
    try {
      await bookReservationServices(res.id, [], pspReference)
      console.log(`   ✅ Webhook: Folio paid for reservation ${res.id}`)
    } catch (error) {
      console.error(`   ❌ Webhook: Failed to pay folio for ${res.id}:`, error)
    }
  }

  // Mark pending booking as completed
  await supabase.from('pending_bookings').update({
    status: 'completed',
    apaleo_booking_id: apaleoData.id,
  }).eq('reference', reference)

  console.log(`✅ Webhook: Successfully processed booking ${apaleoData.id}`)
  return { success: true, bookingId: apaleoData.id }
}

async function addServicesFromPending(reference: string, pspReference: string) {
  const supabase = createAdminClient()

  console.log(`📞 Webhook: Processing services for reference ${reference}`)

  // Query by `transaction_reference` — matches updated schema
  const { data: pendingServices, error: pendingError } = await supabase
    .from('pending_services')
    .select('reservation_id, services_payload, status, lock_key')
    .eq('transaction_reference', reference)
    .maybeSingle()

  if (pendingError || !pendingServices) {
    console.log(`ℹ️ Webhook: No pending services found for ${reference}`)
    return { noPending: true }
  }

  if (pendingServices.status === 'completed') {
    console.log(`✅ Webhook: Services already completed for ${reference}`)
    return { alreadyExists: true }
  }

  console.log(`🔄 Webhook: Adding services to reservation ${pendingServices.reservation_id}...`)

  try {
    const result = await bookReservationServices(
      pendingServices.reservation_id,
      pendingServices.services_payload || [],
      pspReference
    )

    const failedServices = result.services.filter((r: any) => !r.success)
    if (failedServices.length > 0 || (result.payment && !result.payment.success)) {
      console.error(`❌ Webhook: Services failed:`, failedServices)
      await supabase.from('pending_services')
        .update({ 
          status: 'failed',
          error_details: JSON.stringify({ failedServices, payment: result.payment })
        })
        .eq('lock_key', pendingServices.lock_key)
      return { error: 'Services failed', details: failedServices }
    }

    await supabase.from('pending_services')
      .update({ status: 'completed' })
      .eq('lock_key', pendingServices.lock_key)

    console.log(`✅ Webhook: Services added successfully`)
    return { success: true }
  } catch (error) {
    console.error(`❌ Webhook: Services error:`, error)
    await supabase.from('pending_services')
      .update({ 
        status: 'failed',
        error_details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
      })
      .eq('lock_key', pendingServices.lock_key)
    return { error: 'Services error', details: error }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const notificationItems = body.notificationItems || []

    for (const item of notificationItems) {
      const notification = item.NotificationRequestItem

      if (!verifyHmacSignature(notification, ADYEN_HMAC_KEY)) {
        console.error('❌ Webhook: Invalid HMAC signature for', notification.pspReference)
        continue
      }

      const { eventCode, success, merchantReference, pspReference } = notification

      console.log(`📞 Webhook: Event ${eventCode}, success: ${success}, ref: ${merchantReference}`)

      if (eventCode === 'AUTHORISATION' && success === 'true') {
        try {
          const bookingResult = await createBookingFromPending(merchantReference, pspReference)
          console.log(`✅ Webhook booking result:`, bookingResult)

          const servicesResult = await addServicesFromPending(merchantReference, pspReference)
          console.log(`✅ Webhook services result:`, servicesResult)
        } catch (error) {
          console.error(`❌ Webhook: Error processing ${merchantReference}:`, error)
        }
      } else {
        console.log(`ℹ️ Webhook: Ignoring event ${eventCode} with success=${success}`)
      }
    }

    // Adyen requires plain text [accepted], NOT JSON
    return new NextResponse('[accepted]', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    // Always return [accepted] to Adyen even on error — prevents Adyen from retrying
    return new NextResponse('[accepted]', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
