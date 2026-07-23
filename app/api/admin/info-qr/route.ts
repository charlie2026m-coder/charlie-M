import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/requireAdmin'
import { makeQr } from '@/services/selfCheckout'

// Fixed allow-list of public in-room pages this endpoint can encode — the QR
// target is never taken free-form from the query, so the admin QR can't be
// pointed at an arbitrary URL.
const QR_PAGES = {
  information: '/information',
  heatingandcooling: '/heatingandcooling',
} as const

const querySchema = z.object({
  page: z.enum(['information', 'heatingandcooling']).default('information'),
  fmt: z.enum(['svg', 'png']).default('svg'),
  color: z
    .string()
    .regex(/^[0-9a-fA-F]{6}$/)
    .default('000000'),
  logo: z.boolean(),
  download: z.boolean(),
})

/**
 * QR codes for the public in-room guide pages (/information,
 * /heatingandcooling), admin only.
 *
 * Unlike the self-checkout QRs these are room-agnostic: the pages need no
 * token and no reservation, so a SINGLE code per page works for every room.
 * Rendered on the fly from the current origin so it can never point at a
 * stale domain.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams
  const parsed = querySchema.safeParse({
    page: sp.get('page') ?? undefined,
    fmt: sp.get('fmt') ?? undefined,
    color: sp.get('color') ?? undefined,
    logo: sp.get('logo') === '1',
    download: sp.get('download') === '1',
  })
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 })
  }
  const { page, fmt, color, logo, download } = parsed.data

  const base = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
  const { data, mime } = await makeQr(`${base}${QR_PAGES[page]}`, fmt, color, logo)

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Cache-Control': 'private, max-age=86400',
  }
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="QR_${page}.${fmt}"`
  }

  return new NextResponse(typeof data === 'string' ? data : new Uint8Array(data), { headers })
}
