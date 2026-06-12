import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/** Audit log of self-checkout attempts, newest first. */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const raw = Number(request.nextUrl.searchParams.get('limit') || 200)
  const limit = Math.min(Math.max(Number.isFinite(raw) ? Math.floor(raw) : 200, 1), 500)

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('self_checkout_log')
    .select('at, token, reservation_id, unit_id, guest, result')
    .order('at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Log fetch failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    { ok: true, items: data || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
