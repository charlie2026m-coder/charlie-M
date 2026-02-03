import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.NEXT_PUBLIC_GUESTWAY_API_KEY;
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_GUESTWAY_ACCESS_TOKEN;

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
        { error: 'API configuration is missing' },
        { status: 500 }
      );
    }

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

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch reservation: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Full API response:', JSON.stringify(data, null, 2));
    
    const reservation = data.data?.[0] ?? null;

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: reservation.id,
      confirmationCode: reservation.confirmationCode,
      status: reservation.status,
      guestAppUrl: reservation.guestAppUrl,
    });
  } catch (error) {
    console.error('Error in check-in API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



