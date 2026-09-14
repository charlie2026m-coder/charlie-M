import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { scanBreakfast } from '@/services/breakfast'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { tokenFromScan } from '@/lib/breakfastToken'

/**
 * The dining-room door: staff scanned a guest's breakfast QR.
 *
 * Admin-gated because this is the write that marks attendance, and attendance
 * is the number the whole feature exists to produce. A guest able to call it
 * could mark themselves as having eaten, or — worse — burn someone else's
 * morning by scanning a token they found.
 *
 * The rate limit is generous and per-admin-device rather than per-token: a busy
 * sitting is thirty scans in ten minutes from one tablet, and a member of staff
 * locked out at the door has no fallback.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast', 'kitchen'] })
  if (!guard.ok) return guard.response

  if (!checkRateLimit('breakfast-scan-ip', getClientIp(request), 2000)) {
    return NextResponse.json({ ok: false, result: 'error', error: 'rate_limited' }, { status: 429 })
  }

  let body: { token?: unknown; locale?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, result: 'error' }, { status: 400 })
  }

  // The QR carries the guest page's URL; a typed or older code is the bare
  // token. Both come back as the token — anything else is not ours.
  const token = tokenFromScan(body?.token)
  if (!token) {
    return NextResponse.json(
      { ok: false, result: 'unknown_token' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const locale = body?.locale === 'en' ? 'en' : 'de'
  const result = await scanBreakfast(token, locale)

  // Refusals are HTTP 200 with a result: "no booking" and "already checked in"
  // are normal answers at a door, not transport failures, and the screen has to
  // render them rather than an error box.
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
