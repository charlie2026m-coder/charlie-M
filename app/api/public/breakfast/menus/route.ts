import { NextRequest, NextResponse } from 'next/server'
import { menusForRange } from '@/services/breakfast'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

/**
 * What is served on each morning of a date range.
 *
 * Public and unauthenticated because it is public information: the same
 * question a guest asks at reception before deciding whether to buy breakfast.
 * It carries no personal data and no seat counts — the booking modal is not the
 * place to promise a sitting, since the stay may be months away.
 *
 * The range is capped: a request for a decade would otherwise walk a decade of
 * calendar rows to answer a question nobody asked.
 */
const MAX_DAYS = 62
const ISO = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  if (!checkRateLimit('breakfast-menus-ip', getClientIp(request), 1500)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const sp = request.nextUrl.searchParams
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const locale = sp.get('locale') === 'de' ? 'de' : 'en'

  if (!ISO.test(from) || !ISO.test(to) || to < from) {
    return NextResponse.json({ ok: false, error: 'bad_range' }, { status: 400 })
  }

  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  if (days > MAX_DAYS) {
    return NextResponse.json({ ok: false, error: 'range_too_long' }, { status: 400 })
  }

  const mornings = await menusForRange(from, to, locale)

  // Cacheable for a few minutes: the calendar changes when the kitchen edits
  // it, not per request, and every guest opening the modal asks the same thing.
  return NextResponse.json(
    { ok: true, mornings },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
