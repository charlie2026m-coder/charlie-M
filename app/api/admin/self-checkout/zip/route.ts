import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/requireAdmin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { makeQrZip } from '@/services/selfCheckout'
import { logger } from '@/lib/logger'

// Rendering ~125 QR files (especially PNG) takes a few seconds.
export const maxDuration = 60

const querySchema = z.object({
  fmt: z.enum(['svg', 'png']).default('svg'),
  color: z
    .string()
    .regex(/^[0-9a-fA-F]{6}$/)
    .default('000000'),
  logo: z.boolean(),
})

/** Bulk download: one ZIP with a QR file per room. */
// The archive is named after the site's own host (motz19.de -> "motz19",
// charlie-m.de -> "charlie-m"), never a hardcoded hotel: this file gets copied
// between the three properties, and a fixed name means every hotel downloads an
// archive named after a different one. Kind is in the name too — the checkout
// and booking stickers grant different things and must not be mixed up once
// they are sitting in a downloads folder.
function archiveName(base: string, kind: 'booking' | 'checkout', fmt: string): string {
  let slug = 'hotel'
  try {
    slug = new URL(base).hostname.replace(/^www\./, '').split('.')[0] || 'hotel'
  } catch {
    // origin is always a valid URL in practice; fall through to the default.
  }
  return `${slug}-${kind}-qr-${fmt}.zip`
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams
  const parsed = querySchema.safeParse({
    fmt: sp.get('fmt') ?? undefined,
    color: sp.get('color') ?? undefined,
    logo: sp.get('logo') === '1',
  })
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 })
  }
  const { fmt, color, logo } = parsed.data

  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('self_checkout_tokens')
    .select('token, unit_name')
    .order('unit_name', { ascending: true })
  if (error || !rows || rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'No tokens found' }, { status: 404 })
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
  try {
    const zip = await makeQrZip(
      rows.map((r) => ({ base: `QR_${r.unit_name}`, url: `${base}/checkout/${r.token}` })),
      fmt,
      color,
      logo
    )
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archiveName(base, 'checkout', fmt)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    logger.withTag('self-checkout').error('zip failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'ZIP generation failed' }, { status: 500 })
  }
}
