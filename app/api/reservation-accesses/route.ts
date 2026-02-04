import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.GUESTWAY_API_KEY;
const ACCESS_TOKEN = process.env.GUESTWAY_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { reservationIds } = await request.json();

    if (!reservationIds || !Array.isArray(reservationIds) || reservationIds.length === 0) {
      return NextResponse.json(
        { error: 'Reservation IDs array is required' },
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
      { field: 'id', operator: 'in', value: reservationIds }
    ];

    const url = `${API_URL}/reservation-accesses?filters=${encodeURIComponent(JSON.stringify(filters))}`;

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': PARTNERSHIP_API_KEY,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch reservation accesses: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Full reservation accesses response:', JSON.stringify(data, null, 2));

    const accesses = data.data?.map((reservation: any) => {
      const firstAccess = reservation.accesses?.[0];
      return {
        reservationId: reservation.id,
        confirmationCode: reservation.confirmationCode,
        roomNumber: firstAccess?.lock?.doorName || firstAccess?.lock?.name || null,
        pinCode: firstAccess?.code?.pinCode || null,
        fullPinCode: firstAccess?.code?.pinCode && firstAccess?.code?.pinCodeSuffix 
          ? `${firstAccess.code.pinCode}${firstAccess.code.pinCodeSuffix}` 
          : firstAccess?.code?.pinCode || null,
        validFrom: firstAccess?.code?.validFrom || null,
        validTo: firstAccess?.code?.validTo || null,
      };
    }) || [];

    return NextResponse.json({
      accesses,
    });
  } catch (error) {
    console.error('Error in reservation-accesses API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
