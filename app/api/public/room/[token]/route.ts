import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { roomLookup, roomVerify } from '@/services/roomAccess'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

/**
 * Public endpoints behind the in-room QR sticker, consumed by /room/{token}.
 *
 * GET  — which room is this, and is anyone checked in. Never returns the guest's
 *        name: that name is the credential POST asks for.
 * POST — surname check. On success returns the reservation id so the page can
 *        open the guest's cabinet through the usual anonymous-session flow.
 *
 * Two layers of throttling, for two different attacks:
 *   - here, per IP and per ip:token — blunts a scanner hammering one room;
 *   - in roomVerify, per ROOM in the audit log — blunts a patient attacker who
 *     rotates IPs, which the in-memory limiter above cannot see.
 * Policy outcomes are HTTP 200 with an `ok:false` reason; the page reads the
 * JSON, not the status.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }
// A property this size generates a handful of scans a day; this sits far above
// that and far below useful enumeration.
const IP_CAP = 300

const bodySchema = z.object({
  lastName: z.string().min(1).max(100),
})

const tooMany = () =>
  NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429, headers: NO_STORE })

function rateLimited(request: NextRequest, store: string, token: string): boolean {
  const ip = getClientIp(request)
  if (!checkRateLimit('room-access-ip', ip, IP_CAP)) return true
  if (!checkRateLimit(store, `${ip}:${token}`)) return true
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (rateLimited(request, 'room-access-lookup', token)) return tooMany()
  return NextResponse.json(await roomLookup(token), { headers: NO_STORE })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (rateLimited(request, 'room-access-verify', token)) return tooMany()

  let parsed
  try {
    parsed = bodySchema.safeParse(await request.json())
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400, headers: NO_STORE })
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400, headers: NO_STORE })
  }

  return NextResponse.json(await roomVerify(token, parsed.data.lastName), { headers: NO_STORE })
}
