import { NextRequest, NextResponse } from 'next/server'
import { makeQr } from '@/services/selfCheckout'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

/**
 * The guest's breakfast QR, rendered from their own token.
 *
 * Public on purpose: whoever holds the token already sees the page this image
 * lives on, so gating the picture would protect nothing. It is the same token,
 * drawn instead of typed.
 *
 * The code encodes the RAW TOKEN, not a URL. A URL would send any phone camera
 * that happens to point at it to the guest page, and the person holding the
 * scanner at the dining-room door is staff using our admin screen, which wants
 * the token and nothing else. Plain text keeps the two apart.
 *
 * Not cached as immutable even though tokens never rotate: the image is tiny
 * and a wrong cached QR is a guest standing at a door that will not let them in.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!checkRateLimit('breakfast-qr-ip', getClientIp(request), 1500)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  // Never render a QR for something that is not a token shape — an arbitrary
  // string would produce a scannable code that means nothing at the door.
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    return NextResponse.json({ ok: false, error: 'bad_token' }, { status: 400 })
  }

  const fmt = request.nextUrl.searchParams.get('fmt') === 'png' ? 'png' : 'svg'
  const { data, mime } = await makeQr(token, fmt)

  return new NextResponse(data as BodyInit, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
