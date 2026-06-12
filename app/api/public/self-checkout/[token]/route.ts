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
 * Rate limiting is keyed by ip:token (separate buckets for lookup and
 * confirm): hotel Wi-Fi puts every guest behind one NAT IP on checkout
 * morning, so a plain per-IP key would lock rooms out of checking out.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!checkRateLimit('self-checkout-lookup', `${getClientIp(request)}:${token}`)) {
    return NextResponse.json(
      { ok: false, state: 'error', msg: 'Zu viele Anfragen. Bitte gleich erneut versuchen.' },
      { status: 429, headers: NO_STORE }
    )
  }
  return NextResponse.json(await lookup(token), { headers: NO_STORE })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!checkRateLimit('self-checkout-confirm', `${getClientIp(request)}:${token}`)) {
    return NextResponse.json(
      { ok: false, state: 'error', msg: 'Zu viele Anfragen. Bitte gleich erneut versuchen.' },
      { status: 429, headers: NO_STORE }
    )
  }
  const earlyAck = request.nextUrl.searchParams.get('early_ack') === '1'
  return NextResponse.json(await confirm(token, earlyAck), { headers: NO_STORE })
}
