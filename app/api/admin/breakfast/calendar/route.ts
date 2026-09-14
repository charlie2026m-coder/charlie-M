import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { readCalendar, writeCalendar } from '@/services/breakfastAdmin'

/** Which menus are served on which mornings — admin only. */
const NO_STORE = { 'Cache-Control': 'no-store' }
const ISO = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const from = request.nextUrl.searchParams.get('from') ?? ''
  const to = request.nextUrl.searchParams.get('to') ?? ''
  if (!ISO.test(from) || !ISO.test(to) || to < from) {
    return NextResponse.json({ ok: false, error: 'bad_range' }, { status: 400, headers: NO_STORE })
  }

  return NextResponse.json({ ok: true, days: await readCalendar(from, to) }, { headers: NO_STORE })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  const from = String((body as { from?: unknown })?.from ?? '')
  const to = String((body as { to?: unknown })?.to ?? '')
  const codes = (body as { codes?: unknown })?.codes

  if (!ISO.test(from) || !ISO.test(to) || !Array.isArray(codes)) {
    return NextResponse.json({ ok: false, error: 'bad_body' }, { status: 400, headers: NO_STORE })
  }

  const result = await writeCalendar(from, to, codes.map(String))
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}
