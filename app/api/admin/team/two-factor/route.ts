import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { logger } from '@/lib/logger'
import { admin, authUserId, cleanEmail, findRow } from '../_shared'

/**
 * Turn two-step login off for somebody else — the person who lost the phone
 * with the authenticator app on it and cannot get past the code. Their
 * password still stands; they can set the app up again in Settings. Team
 * area only, and never for your own login.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['team'] })
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const email = cleanEmail(body.email)
  if (email === guard.email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: 'self' }, { status: 409 })
  }

  const db = admin()
  const row = await findRow(db, email)
  if (!row) return NextResponse.json({ ok: false, error: 'unknown' }, { status: 404 })

  try {
    const userId = row.user_id ?? (await authUserId(db, email))
    if (!userId) return NextResponse.json({ ok: true, removed: 0 })

    const { data, error } = await db.auth.admin.mfa.listFactors({ userId })
    if (error) throw new Error(error.message)
    let removed = 0
    for (const factor of data?.factors ?? []) {
      const { error: del } = await db.auth.admin.mfa.deleteFactor({ id: factor.id, userId })
      if (del) throw new Error(del.message)
      removed++
    }
    logger.info('team: two-factor removed', { by: guard.email, email, removed })
    return NextResponse.json({ ok: true, removed })
  } catch (e) {
    logger.error('team: two-factor removal failed', {
      by: guard.email,
      email,
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
