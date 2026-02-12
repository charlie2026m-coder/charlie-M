import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getOrRefreshToken } from "@/services/Request"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Booking } from "@/types/booking"
import { bookReservationServices } from "@/services/bookReservationServices"

const APALEO_API_URL = 'https://api.apaleo.com'

interface ApaleoBookingResponse {
  id: string
  reservationIds: { id: string }[]
}


// Helper function to check if error is retriable
const isRetriableError = (status: number): boolean => {
  // Retry only for server errors (500, 502, 503, 504)
  return status >= 500 && status <= 504
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Main function to create booking in Apaleo with retry logic
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
        // Exponential backoff: 1s, 2s
        const delayMs = Math.pow(2, attempt - 1) * 1000
        console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} after ${delayMs}ms delay...`)
        await delay(delayMs)
      } else {
        console.log(`🔄 Attempt ${attempt}/${maxAttempts}: Creating booking in Apaleo...`)
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

        console.error(`❌ Attempt ${attempt}/${maxAttempts} failed: Apaleo API error ${response.status}`)
        console.error('Error details:', JSON.stringify(errorData, null, 2))

        // Check if error is retriable
        if (isRetriableError(response.status) && attempt < maxAttempts) {
          // Continue to next retry
          continue
        }

        // Non-retriable error or last attempt - return error
        return {
          success: false,
          error: errorData,
          status: response.status
        }
      }

      // Success!
      const apaleoData: ApaleoBookingResponse = await response.json()
      console.log(`✅ Attempt ${attempt}/${maxAttempts} succeeded: Booking created with ID ${apaleoData.id}`)
      console.log('📊 Full Apaleo response data:', JSON.stringify(apaleoData, null, 2))
      
      return {
        success: true,
        data: apaleoData
      }

    } catch (error) {
      lastError = error
      console.error(`❌ Attempt ${attempt}/${maxAttempts} failed with exception:`, error)

      // Network errors are retriable
      if (attempt < maxAttempts) {
        continue
      }

      // Last attempt failed
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      }
    }
  }

  // All attempts failed
  return {
    success: false,
    error: lastError,
    status: lastStatus
  }
}

export async function POST(request: Request) {
  try {
    const booking: Booking = await request.json()

    if (booking.transactionReference) {
      console.log('💳 Transaction reference:', booking.transactionReference)
    }

    const token = await getOrRefreshToken()

    // Create clean reservations without services for booking creation
    // Services will be added after booking is created
    const bookingPayload = {
      ...booking,
      reservations: booking.reservations.map(res => {
        const { services, ...cleanReservation } = res as any
        return cleanReservation
      })
    }

    console.log('📦 Booking payload:', JSON.stringify(bookingPayload, null, 2))

    // Create booking in Apaleo with retry logic (3 attempts: 1 initial + 2 retries)
    const result = await createApaleoBookingWithRetry(bookingPayload, token, 3)

    if (!result.success) {
      console.error('❌ All booking attempts failed')
      
      return NextResponse.json(
        { 
          error: 'Failed to create booking after multiple attempts',
          details: result.error,
          status: result.status
        },
        { status: result.status || 500 }
      )
    }

    const apaleoData = result.data!
    
    // Track any issues with services or payments
    const issues: {
      type: 'service' | 'payment' | 'processing',
      reservationId: string,
      details: any
    }[] = []
    
    // Step 2: Book services and pay folios for each reservation (sequentially for reliability)
    if (apaleoData.reservationIds && apaleoData.reservationIds.length > 0) {
      console.log('📋 Step 2: Booking services and paying folios for reservations...')
      
      for (let i = 0; i < booking.reservations.length; i++) {
        const reservation = booking.reservations[i] as any
        const reservationId = apaleoData.reservationIds[i]?.id
        
        if (!reservationId) {
          console.log(`⚠️ Reservation ${i + 1}: No reservation ID found`)
          continue;
        }
        
        
        try {
          // Book services and pay folio in one call
          const result = await bookReservationServices(
            reservationId, 
            reservation.services || [],
            booking.transactionReference // Pass transaction reference for payment
          )
          
          // Check if services failed
          const failedServices = result.services.filter(r => !r.success)
          if (failedServices.length > 0) {
            console.error(`❌ Failed to book ${failedServices.length} service(s):`, failedServices)
            
            issues.push({
              type: 'service',
              reservationId,
              details: failedServices
            })
          }
          
          // Check if payment failed
          if (result.payment && !result.payment.success) {
            console.error(`❌ Failed to pay folio for reservation ${reservationId}`)
            
            issues.push({
              type: 'payment',
              reservationId,
              details: 'error' in result.payment ? result.payment.error : 'Unknown error'
            })
          }
          
          if (reservation.services && reservation.services.length > 0) {
            const successCount = result.services.filter(r => r.success).length
            console.log(`   ✅ ${successCount}/${reservation.services.length} service(s) booked`)
          }
          if (result.payment && 'amount' in result.payment) {
            console.log(`   ✅ Folio paid`)
          }
          
        } catch (error) {
          console.error(`❌ Error processing reservation ${reservationId}:`, error)
          
          issues.push({
            type: 'processing',
            reservationId,
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      if (issues.length > 0) {
        console.log(`\n⚠️ Step 2 completed with ${issues.length} issue(s)`)
      } else {
        console.log('\n✅ Step 2 complete: All reservations processed (services + payments)')
      }
    }

    // Save consent record if consent was given
    try {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (booking.consent && apaleoData.id) {
        const headersList = await headers()
        const ip = 
          headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
          headersList.get('x-real-ip') || 
          'unknown'

        const consentData = {
          user_id: user?.id || null,
          booking_id: apaleoData.id,
          consent_type: 'booking',
          consent_given: true,
          ip_address: ip,
          privacy_policy_version: '1.0',
          consent_date: new Date().toISOString(),
        }

        await supabase.from('consents').insert(consentData)
      }
    } catch (supabaseError) {
      console.error('Failed to save consent to Supabase:', supabaseError)
      // Don't fail the whole request if Supabase fails
    }

    // Return success with booking data and any issues
    if (issues.length > 0) {
      // Booking created successfully, but some services/payments had issues
      return NextResponse.json(
        {
          ...apaleoData,
          partialSuccess: true,
          issues: issues,
          reservationIds: apaleoData.reservationIds.map(r => r.id),
          message: 'Booking created successfully, but some services could not be added'
        },
        { status: 201 }
      )
    }

    // Full success - booking and all services/payments completed
    return NextResponse.json(
      {
        ...apaleoData,
        reservationIds: apaleoData.reservationIds.map(r => r.id)
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Create booking error:', error)
    
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' },{ status: 500 })
  }
}