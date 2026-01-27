import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getOrRefreshToken } from "@/services/Request"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Booking } from "@/types/booking"
import { createFolioPayment } from "@/services/createFolioPayment"

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

    // Add prepaymentAmount to each reservation
    const bookingPayload = {
      ...booking,
      reservations: booking.reservations.map(reservation => ({
        ...reservation,
        prepaymentAmount: {
          amount: reservation.reservationAmount,
          currency: 'EUR'
        }
      }))
    }

    console.log('📦 Creating booking with payload:', JSON.stringify(bookingPayload, null, 2))

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
      console.error('Apaleo API error:', response.status, errorData)
      
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
    // Create folio payment after booking is created
    if (booking.transactionReference && booking.totalAmount) {

      await createFolioPayment(
        apaleoData.id,
        booking.totalAmount,
        booking.transactionReference
      )
      console.log('✅ Folio payment created successfully')
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