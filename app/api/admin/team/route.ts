import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { normaliseAreas, roleLabel } from '@/lib/adminAccess'
import { refuseAreas, refuseRemoval } from '@/lib/teamRules'
import { logger } from '@/lib/logger'
import {
  admin,
  cleanEmail,
  cleanName,
  EMAIL,
  ensureLogin,
  findRow,
  present,
  rows,
} from './_shared'

/**
 * The team: who can log in, and what each person may do. Team area only.
 *
 * Adding somebody creates their login with a temporary password, returned
 * ONCE in the response and never stored or logged; they change it in
 * Settings. If the e-mail already has an account on the site (a guest's, or
 * a login made by hand), that account is put on the team as it is and no
 * password is returned — resetting it is a separate, deliberate action.
 *
 * Removing somebody removes them from the team, not from the site: the auth
 * account stays, since it may be a guest's with bookings on it.
 */
export const dynamic = 'force-dynamic'

const refusal = (code: string, status = 409) => NextResponse.json({ ok: false, error: code }, { status })

export async function GET() {
  const guard = await requireAdmin({ anyOf: ['team'] })
  if (!guard.ok) return guard.response
  const db = admin()
  const members = await present(db, await rows(db), guard.email)
  return NextResponse.json({ ok: true, members }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['team'] })
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const email = cleanEmail(body.email)
  const name = cleanName(body.name)
  const areas = normaliseAreas(body.areas)
  if (!EMAIL.test(email)) return refusal('bad_email', 400)
  if (areas.length === 0) return refusal('no_areas', 400)

  const db = admin()
  if (await findRow(db, email)) return refusal('already_on_team')

  try {
    const login = await ensureLogin(db, email, name)
    const { error } = await db.from('admins').insert({
      email,
      name: name || null,
      areas,
      role: roleLabel(areas).toLowerCase(),
      user_id: login.userId,
    })
    if (error) throw new Error(error.message)

    logger.info('team: member added', { by: guard.email, email, areas, newLogin: login.password !== null })
    const member = (await present(db, [(await findRow(db, email))!], guard.email))[0]
    return NextResponse.json({
      ok: true,
      member,
      temporaryPassword: login.password,
      existingAccount: login.password === null,
    })
  } catch (e) {
    logger.error('team: add failed', { by: guard.email, email, error: e instanceof Error ? e.message : String(e) })
    return refusal('failed', 500)
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['team'] })
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const email = cleanEmail(body.email)
  const db = admin()
  const list = await rows(db)
  const members = list.map(r => ({ email: r.email.toLowerCase(), areas: normaliseAreas(r.areas) }))

  const patch: { name?: string | null; areas?: string[]; role?: string } = {}
  if (typeof body.name === 'string') patch.name = cleanName(body.name) || null
  if (Array.isArray(body.areas)) {
    const next = normaliseAreas(body.areas)
    const why = refuseAreas(members, email, guard.email.toLowerCase(), next)
    if (why) return refusal(why)
    patch.areas = next
    patch.role = roleLabel(next).toLowerCase()
  }
  if (!members.some(m => m.email === email)) return refusal('unknown', 404)
  if (Object.keys(patch).length === 0) return refusal('nothing_to_change', 400)

  const { error } = await db.from('admins').update(patch).ilike('email', email)
  if (error) {
    logger.error('team: update failed', { by: guard.email, email, error: error.message })
    return refusal('failed', 500)
  }
  logger.info('team: member changed', { by: guard.email, email, patch })
  const member = (await present(db, [(await findRow(db, email))!], guard.email))[0]
  return NextResponse.json({ ok: true, member })
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['team'] })
  if (!guard.ok) return guard.response

  const email = cleanEmail(request.nextUrl.searchParams.get('email'))
  const db = admin()
  const members = (await rows(db)).map(r => ({ email: r.email.toLowerCase(), areas: normaliseAreas(r.areas) }))
  const why = refuseRemoval(members, email, guard.email.toLowerCase())
  if (why) return refusal(why, why === 'unknown' ? 404 : 409)

  const { error } = await db.from('admins').delete().ilike('email', email)
  if (error) {
    logger.error('team: remove failed', { by: guard.email, email, error: error.message })
    return refusal('failed', 500)
  }
  logger.info('team: member removed', { by: guard.email, email })
  return NextResponse.json({ ok: true })
}
