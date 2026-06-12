import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * All QR tokens with their guest URLs. Reads with the session client — the
 * admin-only RLS SELECT policy on self_checkout_tokens authorizes it.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('self_checkout_tokens')
    .select('token, unit_id, unit_name, created_at')
    .order('unit_name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Token list failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, '')
  const items = (data || []).map((row) => ({
    ...row,
    url: `${base}/checkout/${row.token}`,
  }))

  return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } })
}
