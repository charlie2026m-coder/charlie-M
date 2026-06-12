import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const API_URL = process.env.GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.GUESTWAY_API_KEY;
const ACCESS_TOKEN = process.env.GUESTWAY_ACCESS_TOKEN;

// Loose guard only (prod has none); Guestway is the source of truth for valid IDs
const RESERVATION_ID_MAX_LENGTH = 64;
const RESERVATION_ID_SAFE_CHARS = /^[A-Za-z0-9-]+$/;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (!checkRateLimit('check-in', ip)) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    // Apaleo / Guestway reservation ids are uppercase — normalize so a
    // lowercased input still resolves.
    const normalized = String(reservationId).trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > RESERVATION_ID_MAX_LENGTH ||
      !RESERVATION_ID_SAFE_CHARS.test(normalized)
    ) {
      return NextResponse.json(
        { error: 'Invalid reservation ID format' },
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
      { field: 'confirmationCode', operator: 'eq', value: normalized }
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
    const reservation = data.data?.[0] ?? null;

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Return only safe fields — never echo guest PII (email, name, phone)
    // that Guestway includes in the reservation object.
    return NextResponse.json({
      id: reservation.id,
      confirmationCode: reservation.confirmationCode,
      status: reservation.status,
      guestAppUrl: reservation.guestAppUrl,
    });
  } catch {
    // Don't log the error object — it can carry the Guestway response (PII).
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
