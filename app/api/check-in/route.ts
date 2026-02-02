import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.NEXT_PUBLIC_GUESTWAY_API_KEY; // X-Api-Key for rate limiting
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_GUESTWAY_ACCESS_TOKEN; // Bearer token for authorization

export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    if (!API_URL || !PARTNERSHIP_API_KEY || !ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'API configuration is missing (URL, Partnership Key, or Access Token)' },
        { status: 500 }
      );
    }

    // Debug token
    console.log('🔐 Access Token length:', ACCESS_TOKEN?.length);
    console.log('🔐 Access Token (first 20 chars):', ACCESS_TOKEN?.substring(0, 20));
    console.log('🔐 Access Token (last 10 chars):', ACCESS_TOKEN?.substring(ACCESS_TOKEN.length - 10));
    
    // First, test if token works at all with a simple request
    const testUrl = `${API_URL}/reservations?pageSize=1`;
    console.log('🧪 Testing token with simple request:', testUrl);
    
    const testResponse = await fetch(testUrl, {
      headers: {
        'X-Api-Key': PARTNERSHIP_API_KEY,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🧪 Test response:', testResponse.status);
    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error('🧪 Token test FAILED:', testError);
    } else {
      console.log('✅ Token works! Proceeding with filtered request...');
    }

    // Now try with filters
    const filters = [
      { field: 'confirmationCode', operator: 'eq', value: reservationId }
    ];

    const url = `${API_URL}/reservations?filters=${encodeURIComponent(JSON.stringify(filters))}`;

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': PARTNERSHIP_API_KEY,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Filtered request response:', response.status, response.statusText);
    
    // Log response headers for debugging
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('📋 Response headers:', responseHeaders);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      return NextResponse.json(
        { error: `Failed to fetch reservation: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reservation = data.items?.[0] ?? null;

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('❌ Error in check-in API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

