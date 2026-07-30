import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/requireAdmin'
import { makeQrZip } from '@/services/selfCheckout'
import { listRooms, roomTokenFor, roomAccessEnabled } from '@/services/roomAccess'
import { logger } from '@/lib/logger'

/**
 * Bulk download of the IN-ROOM "open my booking" QR codes — one file per room,
 * to be printed and stuck up in the studios.
 *
 * These are NOT the self-checkout codes and must not be printed on the same
 * label: self-checkout is a one-tap checkout with no surname, this one opens the
 * guest's cabinet. Different privileges, different stickers.
 */
export const maxDuration = 60

const querySchema = z.object({
  fmt: z.enum(['svg', 'png']).default('svg'),
  color: z.string().regex(/^[0-9a-fA-F]{6}$/).default('000000'),
  logo: z.boolean(),
})

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  if (!roomAccessEnabled()) {
    return NextResponse.json(
      { ok: false, error: 'ROOM_QR_SECRET is not configured — codes would be predictable' },
      { status: 503 },
    )
  }

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

  const rooms = await listRooms()
  if (rooms.length === 0) {
    return NextResponse.json({ ok: false, error: 'No rooms found' }, { status: 404 })
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
  try {
    const zip = await makeQrZip(
      rooms.map(r => ({
        base: `ROOM_${r.unitName}`,
        url: `${base}/room/${roomTokenFor(r.unitId)}`,
      })),
      fmt,
      color,
      logo,
    )
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="motz19-room-qr-${fmt}.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    logger.withTag('room-access').error('QR zip failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ ok: false, error: 'Failed to build ZIP' }, { status: 500 })
  }
}
