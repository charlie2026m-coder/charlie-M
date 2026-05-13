import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.GUESTWAY_API_KEY;
const ACCESS_TOKEN = process.env.GUESTWAY_ACCESS_TOKEN;

// Apaleo reservation ID format: R{PROPERTY}-{alphanumeric}  e.g. RCMH-4X8KZ9AB
const RESERVATION_ID_REGEX = /^R[A-Z]{2,4}-[A-Z0-9]{4,12}$/;

// In-memory rate limiter: 10 requests per IP per 10 minutes
// Resets on server restart; not shared across Vercel instances (acceptable for this use case)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (!checkRateLimit(ip)) {
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

    const normalized = String(reservationId).trim().toUpperCase();

    if (!RESERVATION_ID_REGEX.test(normalized)) {
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
