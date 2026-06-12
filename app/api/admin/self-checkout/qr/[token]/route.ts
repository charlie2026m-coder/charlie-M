import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/requireAdmin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { makeQr, sanitizeFilename } from '@/services/selfCheckout'

const querySchema = z.object({
  fmt: z.enum(['svg', 'png']).default('svg'),
  color: z
    .string()
    .regex(/^[0-9a-fA-F]{6}$/)
    .default('000000'),
  logo: z.boolean(),
  download: z.boolean(),
})

/**
 * Render one room's QR code (admin only). Cached immutable: tokens are static
 * by design — generateTokens never rotates them. Drop `immutable` if token
 * rotation is ever introduced.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { token } = await params
  const sp = request.nextUrl.searchParams
  const parsed = querySchema.safeParse({
    fmt: sp.get('fmt') ?? undefined,
    color: sp.get('color') ?? undefined,
    logo: sp.get('logo') === '1',
    download: sp.get('download') === '1',
  })
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 })
  }
  const { fmt, color, logo, download } = parsed.data

  const supabase = await createSupabaseServerClient()
  const { data: row } = await supabase
    .from('self_checkout_tokens')
    .select('token, unit_name')
    .eq('token', token)
    .maybeSingle()
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Unknown token' }, { status: 404 })
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
  const { data, mime } = await makeQr(`${base}/checkout/${row.token}`, fmt, color, logo)

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Cache-Control': 'private, max-age=86400, immutable',
  }
  if (download) {
    headers['Content-Disposition'] =
      `attachment; filename="QR_${sanitizeFilename(row.unit_name)}.${fmt}"`
  }

  return new NextResponse(typeof data === 'string' ? data : new Uint8Array(data), { headers })
}
