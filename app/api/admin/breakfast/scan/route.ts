import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { scanBreakfast } from '@/services/breakfast'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

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
  const guard = await requireAdmin({ allowKitchen: true })
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

  // Scanners and phone cameras both hand over stray whitespace; a QR that
  // encoded a URL rather than the bare token is not ours, so it is refused
  // rather than parsed — see the note in the QR route.
  const token = String(body?.token ?? '').trim()
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
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
