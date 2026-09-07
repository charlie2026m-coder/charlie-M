import { NextRequest, NextResponse } from 'next/server'
import { guestView, chooseBreakfast } from '@/services/breakfast'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

/**
 * Public breakfast endpoints behind the guest page at /breakfast/{token}.
 *
 * No auth by design — the unguessable token is the credential, exactly as with
 * self-checkout. Its blast radius is smaller still: someone holding a stolen
 * token can change which menu a stranger eats, not spend their money. Breakfast
 * is bought in Apaleo and never here.
 *
 * Rate limiting is two-layered for the same reason as self-checkout: hotel
 * Wi-Fi puts every guest behind one NAT address, so a plain per-IP bucket would
 * lock out the whole house the morning a Guestway message goes out. The fine
 * bucket is per ip:token; the coarse per-IP cap exists because a scanner minting
 * a fresh random token per request would otherwise get a clean fine bucket every
 * time and never be throttled.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }
const IP_CAP = 1500

const tooMany = () =>
  NextResponse.json(
    { ok: false, error: 'rate_limited' },
    { status: 429, headers: NO_STORE },
  )

function rateLimited(request: NextRequest, fineStore: string, token: string): boolean {
  const ip = getClientIp(request)
  if (!checkRateLimit('breakfast-ip', ip, IP_CAP)) return true
  if (!checkRateLimit(fineStore, `${ip}:${token}`)) return true
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (rateLimited(request, 'breakfast-view', token)) return tooMany()

  const locale = request.nextUrl.searchParams.get('locale') === 'de' ? 'de' : 'en'
  const view = await guestView(token, locale)

  // An unknown token is 404, not a friendly empty page: there is nothing to
  // choose and pretending otherwise only wastes the guest's time.
  if (!view) {
    return NextResponse.json({ ok: false, error: 'unknown_token' }, { status: 404, headers: NO_STORE })
  }
  return NextResponse.json({ ok: true, ...view }, { headers: NO_STORE })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (rateLimited(request, 'breakfast-choose', token)) return tooMany()

  let body: { morning?: string; menuCode?: string; slotId?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 400, headers: NO_STORE })
  }

  const morning = String(body?.morning ?? '')
  const menuCode = String(body?.menuCode ?? '')
  const slotId = Number(body?.slotId)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(morning) || !menuCode || !Number.isFinite(slotId)) {
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 400, headers: NO_STORE })
  }

  // Everything is re-checked server-side against Apaleo, the menu calendar and
  // the seat count — the page the guest is looking at may be minutes old.
  const result = await chooseBreakfast(token, morning, menuCode, slotId)

  // Refusals are HTTP 200 with a reason: the page renders the reason, and a
  // "slot is full" is a normal outcome rather than a transport failure.
  return NextResponse.json(result, { headers: NO_STORE })
}
