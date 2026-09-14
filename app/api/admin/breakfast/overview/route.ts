import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { berlinToday, breakfastOverview } from '@/services/breakfast'
import { addDays } from '@/lib/breakfastDates'

/**
 * Breakfasts sold per morning across a range, with the money — admin only.
 *
 * One Apaleo sweep for the whole range plus two reads of our own tables, so a
 * fortnight costs about what one kitchen sheet does. Defaults to the coming two
 * weeks, which is the question an owner opens this to ask.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const ISO = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams
  const today = berlinToday()
  const from = ISO.test(sp.get('from') ?? '') ? (sp.get('from') as string) : today
  const to = ISO.test(sp.get('to') ?? '') ? (sp.get('to') as string) : addDays(today, 13)

  const overview = await breakfastOverview(from, to)
  return NextResponse.json({ ok: true, ...overview }, { headers: { 'Cache-Control': 'no-store' } })
}
