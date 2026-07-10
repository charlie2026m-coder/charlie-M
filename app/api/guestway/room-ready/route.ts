import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { openRoomEarly } from '@/services/apaleo/amendStayTime';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { bookingLog } from '@/lib/logger';

// Talks to Apaleo (Fetch) + uses node crypto → Node runtime, not edge.
export const runtime = 'nodejs';
// Guestway cuts the request at 10s with no retries; the amend still completes
// server-side if we run over. Give Apaleo's few round-trips headroom.
export const maxDuration = 30;

// Apaleo reservation ids look like "XKQMBNPF-1" — letters, digits, dashes.
const RESERVATION_ID_SAFE = /^[A-Za-z0-9-]{1,64}$/;

/** Constant-time string compare (length check first — timingSafeEqual throws on
 *  unequal-length buffers). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Guestway "Room Ready" webhook → open TODAY'S arriving guest's door early.
 *
 * The Guestway automation fires this at max(13:00, room-cleaned) together with
 * the "your room is ready" guest message. We move the reservation's Apaleo
 * arrival to that same moment so the smart-lock code re-syncs and the door
 * actually opens (Guestway's Open API has no door endpoint — the arrival amend
 * is the only lever; the 13:00 floor keeps it inside behaviour proven by the
 * paid ECI). All who/when scoping lives in openRoomEarly; this handler only
 * authenticates, gates and forwards.
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Rate limit (per client IP) — pure flood protection. The cap must be
    //    generous: ALL Guestway webhooks come from one egress IP, and every
    //    room cleaned before 13:00 fires at exactly 13:00 (worst case ≈ all
    //    same-day arrivals of 125 studios in one burst; Guestway never
    //    retries). 300/10min ≫ any real burst yet still kills a dumb flood.
    if (!checkRateLimit('guestway-room-ready', getClientIp(req), 300)) {
      return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
    }

    // 1. Shared-secret auth. The Guestway webhook action can send only a URL +
    //    a fixed JSON body — no custom headers, no signing (verified in its
    //    config UI) — so the secret rides in the URL query, compared in
    //    constant time. The URL is therefore sensitive (it can appear in access
    //    logs): if it ever leaks, rotate GUESTWAY_ROOM_READY_SECRET and update
    //    the Guestway webhook URL.
    const secret = process.env.GUESTWAY_ROOM_READY_SECRET;
    if (!secret) {
      bookingLog.error('room-ready webhook: GUESTWAY_ROOM_READY_SECRET unset — refusing');
      return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
    }
    const key = req.nextUrl.searchParams.get('key') ?? '';
    if (!safeEqual(key, secret)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // 2. Kill switch (default OFF). Lets the Guestway action be wired and fire
    //    as a safe no-op until we flip this on for the controlled live test.
    if (process.env.GUESTWAY_ROOM_READY_ENABLED !== 'true') {
      return NextResponse.json({ ok: true });
    }

    // 3. Parse the payload. confirmationCode / rawId == the Apaleo reservation id.
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
    }
    const reservationId = String(body.confirmationCode ?? body.rawId ?? '').trim();
    const externalId = String(body.externalId ?? '').trim();

    if (!RESERVATION_ID_SAFE.test(reservationId)) {
      return NextResponse.json({ ok: false, error: 'invalid-reservation-id' }, { status: 400 });
    }
    // CharlieM is Apaleo-only; a foreign PMS id would never resolve — skip cleanly
    // instead of probing Apaleo with it.
    if (externalId && externalId !== 'apaleo') {
      return NextResponse.json({ ok: true });
    }

    bookingLog.info('room-ready webhook: received', { reservationId });
    const result = await openRoomEarly(reservationId);
    // Full per-reservation outcome stays in the server log only. The HTTP
    // response is deliberately OPAQUE ({ok:true}) so it can't be used as an
    // "is this guest arriving today?" oracle by a secret holder.
    bookingLog.info('room-ready webhook: result', { reservationId, result });

    // A genuine amend failure comes back non-2xx so it shows as "failed" in the
    // Guestway action log (no retries — purely for visibility). Skips/moves are
    // expected outcomes → 200.
    if (result.status === 'error') {
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    bookingLog.error('room-ready webhook: unhandled error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
