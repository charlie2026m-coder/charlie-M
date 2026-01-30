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

    // Create booking in Apaleo
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
      console.error('❌ Apaleo API error:', response.status)
      console.error('Error details:', JSON.stringify(errorData, null, 2))
      
      return NextResponse.json(
        { 
          error: 'Failed to create booking',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      )
    }

    const apaleoData: ApaleoBookingResponse = await response.json()
    
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
            
            return NextResponse.json(
              { 
                error: 'Failed to book services',
                details: { 
                  failedServices, 
                  bookingId: apaleoData.id,
                  reservationId 
                },
                message: 'Booking created but some services could not be added'
              },
              { status: 500 }
            )
          }
          
          // Check if payment failed
          if (result.payment && !result.payment.success) {
            console.error(`❌ Failed to pay folio for reservation ${reservationId}`)
            
            return NextResponse.json(
              { 
                error: 'Failed to pay folio',
                details: { 
                  bookingId: apaleoData.id,
                  reservationId,
                  paymentError: 'error' in result.payment ? result.payment.error : 'Unknown error'
                },
                message: 'Services added but payment failed'
              },
              { status: 500 }
            )
          }
          
          if (reservation.services && reservation.services.length > 0) {
            console.log(`   ✅ ${reservation.services.length} service(s) booked`)
          }
          if (result.payment && 'amount' in result.payment) {
            console.log(`   ✅ Folio paid`)
          }
          
        } catch (error) {
          console.error(`❌ Error processing reservation ${reservationId}:`, error)
          
          return NextResponse.json(
            { 
              error: 'Failed to process reservation',
              details: { 
                bookingId: apaleoData.id,
                reservationId,
                error: error instanceof Error ? error.message : 'Unknown error'
              },
              message: 'Booking created but reservation processing failed'
            },
            { status: 500 }
          )
        }
      }
      
      console.log('\n✅ Step 2 complete: All reservations processed (services + payments)')
    }

    try {
      const supabase = await createSupabaseServerClient()
      const primaryGuest = booking.reservations[0]?.primaryGuest
      const { data: { user } } = await supabase.auth.getUser()
      
      if (primaryGuest && apaleoData.id && apaleoData.reservationIds) {
        // Create an array of reservations to insert
        const reservationsToInsert = apaleoData.reservationIds.map(reservation => ({
          reservation_id: reservation.id,
          booking_id: apaleoData.id,
          last_name: primaryGuest.lastName,
          email: primaryGuest.email,
        }));

        // Insert all reservations
        await supabase.from('reservations').insert(reservationsToInsert);

        // Save consent record if consent was given
        if (booking.consent) {
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
      }
    } catch (supabaseError) {
      console.error('Failed to save reservations to Supabase:', supabaseError)
      // Don't fail the whole request if Supabase fails
    }

    return NextResponse.json(apaleoData, { status: 201 })
    
  } catch (error) {
    console.error('Create booking error:', error)
    
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' },{ status: 500 })
  }
}