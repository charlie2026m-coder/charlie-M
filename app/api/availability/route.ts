import { NextRequest, NextResponse } from 'next/server';
import { getRooms } from '@/app/actions/apaleo/rooms/getRooms';

// Live availability — never cache this route.
export const dynamic = 'force-dynamic';

// Public, bearer-protected endpoint for the Vapi voice agent (and any external
// caller) to read room availability. Internally it just wraps getRooms(), which
// queries Apaleo /booking/v1/offers — so Apaleo credentials never leave the server.
const API_KEY = process.env.VAPI_AVAILABILITY_KEY;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Light in-memory rate limit as an abuse backstop (the bearer key is the real
// gate). Vapi calls share an egress IP, so keep the window generous.
const rl = new Map<string, { n: number; reset: number }>();
const RL_MAX = 60;
const RL_WINDOW_MS = 60_000;

function rateOk(ip: string): boolean {
  const now = Date.now();
  const e = rl.get(ip);
  if (!e || now > e.reset) {
    rl.set(ip, { n: 1, reset: now + RL_WINDOW_MS });
    return true;
  }
  if (e.n >= RL_MAX) return false;
  e.n++;
  return true;
}

function authorized(req: NextRequest): boolean {
  if (!API_KEY) return false; // misconfigured → fail closed
  return (req.headers.get('authorization') || '') === `Bearer ${API_KEY}`;
}

async function handle(
  req: NextRequest,
  params: { checkin?: unknown; checkout?: unknown; guests?: unknown; locale?: unknown },
) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  if (!rateOk(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkin = String(params.checkin ?? '').trim();
  const checkout = String(params.checkout ?? '').trim();
  const guests = Math.max(1, parseInt(String(params.guests ?? '1'), 10) || 1);
  const locale = params.locale === 'de' ? 'de' : 'en';

  if (!DATE_RE.test(checkin) || !DATE_RE.test(checkout)) {
    return NextResponse.json(
      { error: 'checkin and checkout are required in YYYY-MM-DD format' },
      { status: 400 },
    );
  }

  const result = await getRooms(checkin, checkout, guests, locale);

  if (!Array.isArray(result)) {
    // getRooms returned { error }
    return NextResponse.json({ available: false, rooms: [], error: result.error }, { status: 502 });
  }

  const twoPlus = guests >= 2;
  const rooms = result.map((r) => ({
    type: r.name,
    perNight: twoPlus ? (r.oneNightPriceForTwo ?? r.oneNightPrice) : r.oneNightPrice,
    totalPrice: twoPlus ? (r.priceForTwo ?? r.price ?? null) : (r.price ?? null),
    currency: r.totalGrossAmount?.currency || 'EUR',
    availableCount: r.availableUnits,
  }));

  return NextResponse.json({
    available: rooms.length > 0,
    checkin,
    checkout,
    guests,
    currency: rooms[0]?.currency || 'EUR',
    rooms,
  });
}

// GET — params from query string (easy to test in a browser / curl).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return handle(req, {
    checkin: sp.get('checkin') ?? undefined,
    checkout: sp.get('checkout') ?? undefined,
    guests: sp.get('guests') ?? undefined,
    locale: sp.get('locale') ?? undefined,
  });
}

// POST — params from JSON body (clean 1:1 mapping for the Vapi schema builder).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return handle(req, body as Record<string, unknown>);
}
