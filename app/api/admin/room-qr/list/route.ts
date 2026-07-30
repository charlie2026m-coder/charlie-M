import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { listRooms, roomTokenFor, roomAccessEnabled } from '@/services/roomAccess'

/**
 * The in-room "open my booking" links, per room — so an admin can test one on a
 * phone, or re-print a single sticker, without downloading the whole ZIP.
 * Admin-only: these URLs are the credential the sticker carries.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  if (!roomAccessEnabled()) {
    return NextResponse.json({ ok: false, error: 'ROOM_QR_SECRET is not configured' }, { status: 503 })
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
  const rooms = await listRooms()

  return NextResponse.json(
    {
      ok: true,
      rooms: rooms.map(r => ({
        unitName: r.unitName,
        url: `${base}/room/${roomTokenFor(r.unitId)}`,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
