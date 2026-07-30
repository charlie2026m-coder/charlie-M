import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { findCurrentInhouse, fullReservation, todayBerlin } from '@/services/selfCheckout'
import { logger } from '@/lib/logger'

/**
 * In-room QR → "open my booking".
 *
 * A permanent sticker in each studio. The guest scans it, types their surname,
 * and lands in their own cabinet — where late check-out, extra cleaning, a cot
 * and pets can be bought without calling anyone.
 *
 * Why the token is DERIVED, not stored: it is an HMAC of the unit id, so the
 * sticker for room 13 is stable, unguessable without the secret, and needs no
 * table of its own (and therefore no migration to apply by hand). Resolving a
 * scan means re-deriving the token for each of the ~13 rooms and comparing —
 * cheap, and it reuses self_checkout_tokens purely as the room list.
 *
 * It is deliberately a SEPARATE token from the self-checkout QR: that one opens
 * a one-tap checkout with no surname, so if the two shared a token, one sticker
 * would grant both. They are different privileges and get different codes.
 *
 * Security posture, stated plainly: the sticker lives in a room that cleaners,
 * maintenance and the previous guest have all stood in, so the surname is the
 * only thing between a scan and the guest's cabinet. That is why this module
 * (a) never reveals the guest's name before it is proven, (b) rate-limits
 * guesses per room, and (c) writes every attempt to the audit log. The
 * self-checkout screen DOES show the name on its own token — so treat these
 * two QR codes as different secrets and never print them on the same label.
 */

const roomLog = logger.withTag('room-access')

// Off unless a secret is configured: without it every derived token would be
// predictable from the unit id alone.
function secret(): string | null {
  const s = process.env.ROOM_QR_SECRET
  return s && s.length >= 16 ? s : null
}

export function roomAccessEnabled(): boolean {
  return secret() !== null
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/** Stable, unguessable token for a room's sticker. */
export function roomTokenFor(unitId: string): string {
  const s = secret()
  if (!s) throw new Error('ROOM_QR_SECRET not configured')
  return crypto.createHmac('sha256', s).update(`room:${unitId}`).digest('base64url').slice(0, 32)
}

/** Constant-time compare so a scan cannot be brute-forced character by character. */
function tokenMatches(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export interface RoomRow {
  propertyId: string
  unitId: string
  unitName: string
}

/** All rooms, from the self-checkout token table (used here only as the room list). */
export async function listRooms(): Promise<RoomRow[]> {
  const { data, error } = await createAdminClient()
    .from('self_checkout_tokens')
    .select('property_id, unit_id, unit_name')
    .order('unit_name', { ascending: true })
  if (error) {
    roomLog.error('room list failed', { error: error.message })
    return []
  }
  return (data ?? []).map(r => ({
    propertyId: r.property_id,
    unitId: r.unit_id,
    unitName: r.unit_name,
  }))
}

/** Which room does this sticker belong to? Null when it matches none. */
export async function resolveRoomToken(token: string): Promise<RoomRow | null> {
  if (!token || !secret()) return null
  for (const room of await listRooms()) {
    if (tokenMatches(roomTokenFor(room.unitId), token)) return room
  }
  return null
}

/** Audit trail. Shares self_checkout_log (same shape, same retention); the
 *  `room:` prefix on `result` keeps the two flows distinguishable. Never throws. */
async function record(entry: {
  token: string
  reservation_id?: string
  unit_id?: string
  guest?: string
  result: string
}): Promise<void> {
  try {
    await createAdminClient().from('self_checkout_log').insert(entry)
  } catch (e) {
    roomLog.warn('room-access log insert failed', { error: e instanceof Error ? e.message : String(e) })
  }
}

// Guess budget per room. A guest knows their own surname first try; anyone
// working through a list does not. Counted over a rolling window.
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

async function tooManyAttempts(token: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - WINDOW_MS).toISOString()
    const { count, error } = await createAdminClient()
      .from('self_checkout_log')
      .select('id', { count: 'exact', head: true })
      .eq('token', token)
      .eq('result', 'room:wrong_name')
      .gte('at', since)
    if (error) {
      // Fail OPEN on a counting failure: a Supabase blip must not lock a paying
      // guest out of their own booking. The attempt is still logged, so abuse
      // stays visible after the fact.
      roomLog.warn('room-access rate check failed — allowing', { error: error.message })
      return false
    }
    return (count ?? 0) >= MAX_ATTEMPTS
  } catch {
    return false
  }
}

/** Fold case, accents, spacing and punctuation so "Müller", "muller", " MULLER ",
 *  "St. Marie", "St Marie" and "O'Brien" all match the same booking. Dropped
 *  characters are only separators and marks — the letters still have to agree,
 *  so unrelated names cannot collide. */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s.,'’`-]+/g, '')
    .trim()
}

export type RoomLookup =
  | { ok: true; room: string; occupied: boolean }
  | { ok: false; reason: 'invalid' | 'disabled' }

/**
 * What the scanner sees BEFORE proving anything: the room name, and whether
 * someone is checked in. Deliberately no guest name — that is the shared secret
 * the next step asks for.
 */
export async function roomLookup(token: string): Promise<RoomLookup> {
  if (!secret()) return { ok: false, reason: 'disabled' }
  const room = await resolveRoomToken(token)
  if (!room) return { ok: false, reason: 'invalid' }

  try {
    const resv = await findCurrentInhouse(room.unitId, todayBerlin())
    return { ok: true, room: room.unitName, occupied: Boolean(resv) }
  } catch (e) {
    roomLog.warn('room lookup: apaleo read failed', { error: e instanceof Error ? e.message : String(e) })
    return { ok: true, room: room.unitName, occupied: false }
  }
}

export type RoomVerify =
  | { ok: true; reservationId: string }
  | { ok: false; reason: 'invalid' | 'disabled' | 'nobody_here' | 'wrong_name' | 'rate_limited' | 'error' }

/**
 * Prove the scanner is the guest, and hand back the reservation id so the page
 * can open their cabinet through the normal anonymous-session flow.
 *
 * The name is checked against the reservation currently checked into THIS room,
 * so a correct surname on the wrong room proves nothing.
 */
export async function roomVerify(token: string, lastName: string): Promise<RoomVerify> {
  if (!secret()) return { ok: false, reason: 'disabled' }
  const room = await resolveRoomToken(token)
  if (!room) return { ok: false, reason: 'invalid' }

  if (await tooManyAttempts(token)) {
    await record({ token, unit_id: room.unitId, result: 'room:rate_limited' })
    roomLog.warn('room access: too many wrong surnames', { unit: room.unitName })
    return { ok: false, reason: 'rate_limited' }
  }

  let resv
  try {
    resv = await findCurrentInhouse(room.unitId, todayBerlin())
  } catch (e) {
    roomLog.error('room verify: apaleo read failed', { error: e instanceof Error ? e.message : String(e) })
    await record({ token, unit_id: room.unitId, result: 'room:error' })
    return { ok: false, reason: 'error' }
  }

  if (!resv?.id) {
    await record({ token, unit_id: room.unitId, result: 'room:nobody_here' })
    return { ok: false, reason: 'nobody_here' }
  }

  // The reservations LIST returns only a head (id/status/unit) — no guest. Read
  // the full reservation for the name, which also re-checks the property so a
  // booking from the other hotel on the shared Apaleo account can never match.
  let full
  try {
    full = await fullReservation(resv.id)
  } catch (e) {
    roomLog.error('room verify: reservation read failed', { error: e instanceof Error ? e.message : String(e) })
    await record({ token, unit_id: room.unitId, reservation_id: resv.id, result: 'room:error' })
    return { ok: false, reason: 'error' }
  }
  if (!full) {
    await record({ token, unit_id: room.unitId, reservation_id: resv.id, result: 'room:nobody_here' })
    return { ok: false, reason: 'nobody_here' }
  }

  const actual = full.primaryGuest?.lastName ?? ''
  const given = normalizeName(lastName ?? '')
  if (!given || !actual || normalizeName(actual) !== given) {
    await record({
      token,
      unit_id: room.unitId,
      reservation_id: resv.id,
      result: 'room:wrong_name',
    })
    return { ok: false, reason: 'wrong_name' }
  }

  await record({
    token,
    unit_id: room.unitId,
    reservation_id: resv.id,
    guest: actual,
    result: 'room:ok',
  })
  roomLog.info('room access granted', { unit: room.unitName, reservation: resv.id })
  return { ok: true, reservationId: resv.id }
}
