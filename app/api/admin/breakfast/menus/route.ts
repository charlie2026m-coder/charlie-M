import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { createMenu, listMenus, updateMenu } from '@/services/breakfastAdmin'

/**
 * The breakfast menus, as the kitchen edits them — admin only.
 *
 * No DELETE on purpose: a code is referenced by every booking that ever chose
 * it, so removing one would cascade a stranger's breakfast out of the record.
 * PATCH is_active:false takes it off the guest's choices instead.
 */
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response
  return NextResponse.json({ ok: true, menus: await listMenus() }, { headers: NO_STORE })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'bad_body' }, { status: 400, headers: NO_STORE })
  }

  const result = await createMenu(body as Record<string, unknown>)
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'bad_body' }, { status: 400, headers: NO_STORE })
  }

  const code = String((body as { code?: unknown }).code ?? '')
  const result = await updateMenu(code, body as Record<string, unknown>)
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}
