import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { createSlot, deleteSlot, listSlots, updateSlot } from '@/services/breakfastAdmin'

/** The sittings and their capacity — admin only. */
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response
  return NextResponse.json({ ok: true, slots: await listSlots() }, { headers: NO_STORE })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'bad_body' }, { status: 400, headers: NO_STORE })
  }

  const result = await createSlot(body as Record<string, unknown>)
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  const id = Number((body as { id?: unknown })?.id)
  if (!body || !Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'bad_body' }, { status: 400, headers: NO_STORE })
  }

  const result = await updateSlot(id, body as Record<string, unknown>)
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const id = Number(request.nextUrl.searchParams.get('id'))
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400, headers: NO_STORE })
  }

  const result = await deleteSlot(id)
  return NextResponse.json(result, { status: result.ok ? 200 : 409, headers: NO_STORE })
}
