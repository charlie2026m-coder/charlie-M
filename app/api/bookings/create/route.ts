import { NextRequest, NextResponse } from 'next/server';
import { getOrRefreshToken } from '@/services/Request';
import { Booking } from '@/types/booking';

const APALEO_API_URL = 'https://api.apaleo.com';

export async function POST(request: NextRequest) {
  try {
    // Get booking data from request body
    const booking: Booking = await request.json();
    
    // Validate booking data
    if (!booking.reservations?.primaryGuest?.email) {
      return NextResponse.json(
        { error: 'Missing required guest information' },
        { status: 400 }
      );
    }

    // Get token on server side (secure!)
    const token = await getOrRefreshToken();

    // Create booking in Apaleo
    const response = await fetch(`${APALEO_API_URL}/booking/v1/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Apaleo API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: 'Failed to create booking',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('Create booking error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

