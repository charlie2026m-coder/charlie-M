import { NextRequest, NextResponse } from 'next/server'
import { lookup, confirm } from '@/services/selfCheckout'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

/**
 * Public self-checkout endpoints consumed by the guest page at
 * /checkout/{token}. No auth by design — the unguessable token is the
 * credential; its blast radius is one checkout of one room on departure day.
 *
 * Policy responses are always HTTP 200 — the page reads the JSON `state`,
 * never the HTTP status.
 *
 * Rate limiting is TWO-LAYERED:
 *   - fine, per ip:token (10/window) — hotel Wi-Fi puts every guest behind one
 *     NAT IP on checkout morning, so a plain per-IP key would lock rooms out;
 *   - coarse, per IP (IP_CAP/window) — a scanner that mints a NEW random token
 *     per request would otherwise get a fresh fine bucket every time and never
 *     be throttled at all. The coarse cap stops that while sitting well above a
 *     fully-booked property's legitimate morning burst (lookups + confirms).
 */

const NO_STORE = { 'Cache-Control': 'no-store' }
// Generous enough for a large property's checkout morning (every room a few
// calls), low enough to bound a token-enumeration scanner.
const IP_CAP = 1500

// Fresh response per call — a NextResponse body is a one-shot stream and must
// not be shared across requests.
const tooMany = () =>
  NextResponse.json(
    { ok: false, state: 'error', msg: 'Zu viele Anfragen. Bitte gleich erneut versuchen.' },
    { status: 429, headers: NO_STORE }
  )

function rateLimited(request: NextRequest, fineStore: string, token: string): boolean {
  const ip = getClientIp(request)
  // Coarse per-IP cap first (catches new-token-per-request scanners), then the
  // fine per-ip:token bucket (the NAT-friendly limit). Both must pass.
  if (!checkRateLimit('self-checkout-ip', ip, IP_CAP)) return true
  if (!checkRateLimit(fineStore, `${ip}:${token}`)) return true
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (rateLimited(request, 'self-checkout-lookup', token)) return tooMany()
  return NextResponse.json(await lookup(token), { headers: NO_STORE })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (rateLimited(request, 'self-checkout-confirm', token)) return tooMany()
  const earlyAck = request.nextUrl.searchParams.get('early_ack') === '1'
  return NextResponse.json(await confirm(token, earlyAck), { headers: NO_STORE })
}
