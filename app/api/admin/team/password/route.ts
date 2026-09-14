import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { logger } from '@/lib/logger'
import { admin, authUserId, cleanEmail, findRow, temporaryPassword } from '../_shared'

/**
 * A new temporary password for somebody on the team — for the person who
 * forgot theirs, or was added before the panel could make logins. Returned
 * once, never stored or logged. Not for your own login: that is Settings,
 * where you know the old one.
 *
 * If the e-mail has no auth account yet (a row inserted by hand), the account
 * is created here with that password.
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

  const password = temporaryPassword()
  try {
    let userId = row.user_id ?? (await authUserId(db, email))
    if (userId) {
      const { error } = await db.auth.admin.updateUserById(userId, { password })
      if (error) throw new Error(error.message)
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: row.name ? { full_name: row.name } : undefined,
      })
      if (error || !data.user) throw new Error(error?.message ?? 'Could not create the login')
      userId = data.user.id
    }
    if (userId !== row.user_id) await db.from('admins').update({ user_id: userId }).eq('email', email)

    logger.info('team: password reset', { by: guard.email, email })
    return NextResponse.json({ ok: true, temporaryPassword: password })
  } catch (e) {
    logger.error('team: password reset failed', {
      by: guard.email,
      email,
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
