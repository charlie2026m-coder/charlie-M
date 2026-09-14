import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { normaliseAreas, roleLabel, type Area } from '@/lib/adminAccess'
import { logger } from '@/lib/logger'

const bfLog = logger.withTag('team')

/**
 * What the three team routes share: the service-role client (the staff list
 * is no longer readable by anyone else), the row shape, and the two things
 * that touch auth accounts — finding one by e-mail and minting a password.
 *
 * A folder starting with `_` is not a route; this file is imported, never
 * served.
 */

export const admin = (): SupabaseClient =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export interface Row {
  email: string
  name: string | null
  areas: string[] | null
  user_id: string | null
  created_at: string
}

export interface Member {
  email: string
  name: string | null
  areas: Area[]
  role: string
  hasLogin: boolean
  twoFactor: boolean
  isYou: boolean
  createdAt: string
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const cleanEmail = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '')
export const cleanName = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, 80) : '')

export async function rows(db: SupabaseClient): Promise<Row[]> {
  const { data, error } = await db
    .from('admins')
    .select('email, name, areas, user_id, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}

/**
 * One staff row by e-mail. `eq`, never `ilike`: an ilike value is a LIKE
 * PATTERN, so an address containing `_` (which is common) would match its
 * neighbours as well, and the caller would edit or delete more rows than it
 * named. Addresses are stored lower-cased by this API, and `cleanEmail`
 * lower-cases what comes in, so exact matching is also correct.
 */
export async function findRow(db: SupabaseClient, email: string): Promise<Row | null> {
  const { data } = await db
    .from('admins')
    .select('email, name, areas, user_id, created_at')
    .eq('email', email)
    .maybeSingle()
  return (data as Row | null) ?? null
}

/** Whether the account has finished setting up an authenticator app. */
async function twoFactorOn(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.auth.admin.mfa.listFactors({ userId })
  return (data?.factors ?? []).some(f => f.status === 'verified')
}

export async function present(db: SupabaseClient, list: Row[], you: string): Promise<Member[]> {
  return Promise.all(
    list.map(async row => {
      const areas = normaliseAreas(row.areas)
      return {
        email: row.email,
        name: row.name,
        areas,
        role: roleLabel(areas),
        hasLogin: row.user_id !== null,
        twoFactor: row.user_id ? await twoFactorOn(db, row.user_id) : false,
        isYou: row.email.toLowerCase() === you.toLowerCase(),
        createdAt: row.created_at,
      }
    }),
  )
}

/**
 * The auth account behind an e-mail, if any. Via a SECURITY DEFINER function
 * because PostgREST does not expose `auth.users`, and listing every guest
 * account to find one staff member would not scale.
 */
export async function authUserId(db: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await db.rpc('auth_user_id_by_email', { p_email: email })
  if (error) throw new Error(error.message)
  return typeof data === 'string' && data ? data : null
}

/**
 * Something a person can read out over the phone: three blocks of four from
 * an alphabet without 0/O, 1/l/I. Twelve characters of that is about 68 bits.
 */
export function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(12)
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`
}

/**
 * Make sure an auth account exists for this e-mail. Returns the account id and
 * the password that was set — only when the account was created here; an
 * account that already existed (a guest's, say) keeps its password.
 */
export async function ensureLogin(
  db: SupabaseClient,
  email: string,
  name: string,
): Promise<{ userId: string; password: string | null; created: boolean }> {
  const existing = await authUserId(db, email)
  if (existing) return { userId: existing, password: null, created: false }

  const password = temporaryPassword()
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  })
  if (error || !data.user) throw new Error(error?.message ?? 'Could not create the login')
  return { userId: data.user.id, password, created: true }
}

/**
 * Undo a login this request had just created, when the staff row it was for
 * could not be written. Without this the account is left behind: the next
 * attempt finds it, hands back no password because it "already existed", and
 * the person is on the team with a password nobody knows.
 */
export async function undoLogin(db: SupabaseClient, userId: string): Promise<void> {
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) bfLog.error('team: orphan login not removed', { userId, error: error.message })
}
