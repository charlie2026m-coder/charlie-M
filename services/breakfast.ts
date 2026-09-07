/**
 * Breakfast: menus, sittings, and who actually came down.
 *
 * The money is NOT here and must never move here. Breakfast is sold exactly as
 * before — two Apaleo services (CMH-BRKF at 7%, CMH-BRKFG at 19%) per person
 * per night — and Apaleo stays the only answer to "who paid, for which dates".
 * This module reads that answer and adds the three things Apaleo has no place
 * for: which menu the guest picked, which sitting they take, and whether they
 * turned up. A bug in here can spoil a morning; it cannot mis-bill anyone.
 *
 * THE DATE SHIFT — read before touching anything.
 * Apaleo dates a daily service by the NIGHT: a guest arriving on the 10th for
 * three nights carries serviceDates 10, 11, 12 and leaves on the 13th. Nobody
 * eats breakfast on the evening they arrive; they eat it the morning after.
 * So the morning served is serviceDate + 1 day, and the last breakfast falls on
 * the departure date. Get this wrong and every guest is offered the wrong menu
 * on the wrong day while the kitchen counts land a day out.
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Fetch } from '@/services/Request'
import { logger } from '@/lib/logger'
import { BREAKFAST_FOOD_ID } from '@/lib/breakfastBundle'
import type { ApaleoReservationResponse } from '@/types/apaleo'

const bfLog = logger.withTag('breakfast')

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const propertyId = () => process.env.APALEO_PROPERTY_ID || 'CMH'

/** Berlin's calendar date as YYYY-MM-DD — the hotel's "today", not the server's. */
export function berlinToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
}

/** YYYY-MM-DD + n days, without dragging in a date library or a timezone. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── What Apaleo says is paid for ────────────────────────────────────────────

export interface PaidBreakfast {
  /** The morning the guest eats — serviceDate + 1. See the note at the top. */
  morning: string
  persons: number
}

interface ServiceDateEntry {
  serviceDate?: string
  count?: number
}

/**
 * The mornings this reservation has breakfast for, and for how many people.
 *
 * Counts the FOOD half only. Both halves are booked with the same count for the
 * same dates — adding them together would seat every guest twice.
 */
export function paidBreakfastMornings(reservation: ApaleoReservationResponse): PaidBreakfast[] {
  const services = (reservation?.services ?? []) as Array<{
    service?: { id?: string }
    dates?: ServiceDateEntry[]
  }>

  const byMorning = new Map<string, number>()
  for (const entry of services) {
    if (entry?.service?.id !== BREAKFAST_FOOD_ID) continue
    for (const d of entry.dates ?? []) {
      const night = String(d?.serviceDate ?? '').slice(0, 10)
      if (!night) continue
      const count = Number(d?.count ?? 0)
      if (!Number.isFinite(count) || count <= 0) continue
      const morning = addDays(night, 1)
      byMorning.set(morning, (byMorning.get(morning) ?? 0) + count)
    }
  }

  return [...byMorning.entries()]
    .map(([morning, persons]) => ({ morning, persons }))
    .sort((a, b) => a.morning.localeCompare(b.morning))
}

async function loadReservation(reservationId: string): Promise<ApaleoReservationResponse | null> {
  try {
    return await Fetch<ApaleoReservationResponse>(
      `/booking/v1/reservations/${encodeURIComponent(reservationId)}` +
        `?propertyIds=${propertyId()}&expand=services&expand=primaryGuest&expand=unit`,
    )
  } catch (e) {
    bfLog.warn('reservation lookup failed', { reservationId, error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

// ── Token ───────────────────────────────────────────────────────────────────

/**
 * One unguessable token per reservation (72 bits, same shape as the
 * self-checkout ones). It backs both the "choose your menu" link and the QR the
 * guest shows at the door, so the guest saves one thing and we resolve it
 * against whatever morning it is when they show it.
 *
 * Never rotated: the guest may have the QR in their wallet.
 */
export async function ensureBreakfastToken(reservationId: string): Promise<string> {
  const db = admin()
  const { data: existing } = await db
    .from('breakfast_tokens')
    .select('token')
    .eq('reservation_id', reservationId)
    .maybeSingle()

  if (existing?.token) return existing.token

  const token = crypto.randomBytes(9).toString('base64url')
  const { error } = await db.from('breakfast_tokens').insert({ token, reservation_id: reservationId })
  if (error) {
    // A concurrent caller may have won the race; the unique index makes that
    // safe to recover from rather than a hard failure.
    const { data: retry } = await db
      .from('breakfast_tokens')
      .select('token')
      .eq('reservation_id', reservationId)
      .maybeSingle()
    if (retry?.token) return retry.token
    throw new Error(`could not create breakfast token: ${error.message}`)
  }
  return token
}

// ── The guest's view ────────────────────────────────────────────────────────

export interface MenuView {
  code: string
  name: string
  description: string
  items: string[]
  allergens: string
  photoUrl: string | null
}

export interface SlotView {
  id: number
  startsAt: string
  endsAt: string
  capacity: number
  seatsLeft: number
}

export interface MorningView {
  morning: string
  persons: number
  /** Menus on offer that morning. Empty means the kitchen offers nothing. */
  menus: MenuView[]
  slots: SlotView[]
  chosenMenu: string | null
  chosenSlot: number | null
  attendedAt: string | null
}

export interface GuestBreakfastView {
  reservationId: string
  guestFirstName: string
  mornings: MorningView[]
  /** True when at least one morning is still missing a menu or a sitting. */
  needsChoice: boolean
}

const pick = (locale: string, de: string, en: string) => (locale === 'de' ? de || en : en || de)

const toLines = (s: string): string[] =>
  String(s || '')
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean)

/**
 * Everything the token page needs, for the mornings that are actually paid for.
 *
 * Past mornings are dropped: offering a menu for yesterday is noise, and the
 * kitchen cannot act on it either way.
 */
export async function guestView(token: string, locale = 'en'): Promise<GuestBreakfastView | null> {
  const db = admin()
  const { data: row } = await db
    .from('breakfast_tokens')
    .select('reservation_id')
    .eq('token', token)
    .maybeSingle()

  if (!row?.reservation_id) return null
  const reservationId = String(row.reservation_id)

  const reservation = await loadReservation(reservationId)
  if (!reservation) return null

  const today = berlinToday()
  const paid = paidBreakfastMornings(reservation).filter(p => p.morning >= today)
  if (paid.length === 0) {
    return {
      reservationId,
      guestFirstName: String(reservation.primaryGuest?.firstName ?? '').trim(),
      mornings: [],
      needsChoice: false,
    }
  }

  const dates = paid.map(p => p.morning)

  const [{ data: menus }, { data: menuDays }, { data: slots }, { data: bookings }, { data: taken }] =
    await Promise.all([
      db.from('breakfast_menus').select('*').eq('is_active', true).order('sort_order'),
      db.from('breakfast_menu_days').select('service_date, menu_code').in('service_date', dates),
      db.from('breakfast_slots').select('*').eq('is_active', true).order('sort_order'),
      db.from('breakfast_bookings').select('*').eq('reservation_id', reservationId).in('service_date', dates),
      // Seats already promised by everyone, this reservation included — its own
      // share is subtracted per morning below so a guest never sees their own
      // seats counted against them.
      db.from('breakfast_bookings').select('service_date, slot_id, persons, reservation_id').in('service_date', dates),
    ])

  const menuByCode = new Map((menus ?? []).map(m => [String(m.code), m]))
  const offeredByDate = new Map<string, string[]>()
  for (const d of menuDays ?? []) {
    const key = String(d.service_date).slice(0, 10)
    offeredByDate.set(key, [...(offeredByDate.get(key) ?? []), String(d.menu_code)])
  }

  const mineByDate = new Map((bookings ?? []).map(b => [String(b.service_date).slice(0, 10), b]))

  const takenBy = new Map<string, number>() // `${date}|${slotId}` -> persons
  for (const b of taken ?? []) {
    if (b.slot_id == null) continue
    if (String(b.reservation_id) === reservationId) continue
    const key = `${String(b.service_date).slice(0, 10)}|${b.slot_id}`
    takenBy.set(key, (takenBy.get(key) ?? 0) + Number(b.persons ?? 0))
  }

  const mornings: MorningView[] = paid.map(({ morning, persons }) => {
    const mine = mineByDate.get(morning)
    const codes = offeredByDate.get(morning) ?? []
    return {
      morning,
      persons,
      menus: codes
        .map(code => menuByCode.get(code))
        .filter(Boolean)
        .map(m => ({
          code: String(m!.code),
          name: pick(locale, String(m!.name_de), String(m!.name_en)),
          description: pick(locale, String(m!.description_de), String(m!.description_en)),
          items: toLines(pick(locale, String(m!.items_de), String(m!.items_en))),
          allergens: pick(locale, String(m!.allergens_de), String(m!.allergens_en)),
          photoUrl: (m!.photo_url as string | null) ?? null,
        })),
      slots: (slots ?? []).map(s => {
        const used = takenBy.get(`${morning}|${s.id}`) ?? 0
        return {
          id: Number(s.id),
          startsAt: String(s.starts_at).slice(0, 5),
          endsAt: String(s.ends_at).slice(0, 5),
          capacity: Number(s.capacity),
          seatsLeft: Math.max(0, Number(s.capacity) - used),
        }
      }),
      chosenMenu: (mine?.menu_code as string | null) ?? null,
      chosenSlot: mine?.slot_id != null ? Number(mine.slot_id) : null,
      attendedAt: (mine?.attended_at as string | null) ?? null,
    }
  })

  return {
    reservationId,
    guestFirstName: String(reservation.primaryGuest?.firstName ?? '').trim(),
    mornings,
    // A morning with nothing on offer is not the guest's problem to solve, so
    // it does not count as an outstanding choice.
    needsChoice: mornings.some(m => m.menus.length > 0 && (!m.chosenMenu || m.chosenSlot == null)),
  }
}

// ── Choosing ────────────────────────────────────────────────────────────────

export type ChooseResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_token' | 'not_paid' | 'menu_not_offered' | 'slot_full' | 'slot_not_found' | 'past' | 'error'; detail?: string }

/**
 * Record the guest's menu and sitting for one morning.
 *
 * Everything is re-checked server-side against Apaleo and the menu calendar:
 * the page the guest is looking at may be minutes old, and the last seat may
 * be gone. The seat maths itself runs inside book_breakfast_slot, which locks
 * the sitting — two guests taking the last seat at the same moment is not
 * hypothetical when a Guestway blast lands on every phone at once.
 */
export async function chooseBreakfast(
  token: string,
  morning: string,
  menuCode: string,
  slotId: number,
): Promise<ChooseResult> {
  const db = admin()
  const { data: row } = await db
    .from('breakfast_tokens')
    .select('reservation_id')
    .eq('token', token)
    .maybeSingle()
  if (!row?.reservation_id) return { ok: false, reason: 'unknown_token' }
  const reservationId = String(row.reservation_id)

  if (morning < berlinToday()) return { ok: false, reason: 'past' }

  const reservation = await loadReservation(reservationId)
  if (!reservation) return { ok: false, reason: 'error', detail: 'reservation unavailable' }

  const paid = paidBreakfastMornings(reservation).find(p => p.morning === morning)
  if (!paid) return { ok: false, reason: 'not_paid' }

  const { data: offered } = await db
    .from('breakfast_menu_days')
    .select('menu_code')
    .eq('service_date', morning)
    .eq('menu_code', menuCode)
    .maybeSingle()
  if (!offered) return { ok: false, reason: 'menu_not_offered' }

  const { error } = await db.rpc('book_breakfast_slot', {
    p_reservation_id: reservationId,
    p_service_date: morning,
    p_persons: paid.persons,
    p_menu_code: menuCode,
    p_slot_id: slotId,
  })

  if (error) {
    const msg = String(error.message || '')
    if (msg.includes('slot_full')) return { ok: false, reason: 'slot_full' }
    if (msg.includes('slot_not_found')) return { ok: false, reason: 'slot_not_found' }
    bfLog.error('choose failed', { reservationId, morning, error: msg })
    return { ok: false, reason: 'error', detail: msg.slice(0, 200) }
  }

  return { ok: true }
}

// ── The door ────────────────────────────────────────────────────────────────

export interface ScanResult {
  ok: boolean
  result: 'ok' | 'already' | 'no_booking' | 'not_paid' | 'unknown_token' | 'error'
  guest?: string
  room?: string
  menu?: { code: string; name: string } | null
  slot?: { startsAt: string; endsAt: string } | null
  persons?: number
  attendedAt?: string | null
}

/**
 * A member of staff scanned the guest's QR at the dining-room door.
 *
 * Resolves the token against THIS morning and answers the two questions the
 * person holding the scanner actually has: may they come in, and which menu do
 * they get. Marks attendance on the way — that count is the reason the feature
 * exists, so it must be written on the accepted path, not inferred later.
 *
 * A second scan is not an error: staff re-scan when the screen was missed. It
 * answers "already", keeps the first timestamp and does not double-count.
 */
export async function scanBreakfast(token: string, locale = 'de'): Promise<ScanResult> {
  const db = admin()
  const morning = berlinToday()

  const log = (result: ScanResult['result'], extra: Record<string, unknown> = {}) =>
    db.from('breakfast_scan_log').insert({ token, service_date: morning, result, ...extra })

  const { data: row } = await db
    .from('breakfast_tokens')
    .select('reservation_id')
    .eq('token', token)
    .maybeSingle()

  if (!row?.reservation_id) {
    await log('unknown_token')
    return { ok: false, result: 'unknown_token' }
  }
  const reservationId = String(row.reservation_id)

  const reservation = await loadReservation(reservationId)
  if (!reservation) {
    await log('error', { reservation_id: reservationId })
    return { ok: false, result: 'error' }
  }

  const guest = [reservation.primaryGuest?.firstName, reservation.primaryGuest?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  // The shared reservation type does not declare `unit` even though the
  // expand returns it; a narrow local shape beats widening a type the whole
  // money path depends on.
  const room = String((reservation as { unit?: { name?: string } }).unit?.name ?? '')

  const paid = paidBreakfastMornings(reservation).find(p => p.morning === morning)
  if (!paid) {
    await log('not_paid', { reservation_id: reservationId, guest })
    return { ok: false, result: 'not_paid', guest, room }
  }

  const { data: booking } = await db
    .from('breakfast_bookings')
    .select('id, menu_code, slot_id, attended_at, persons')
    .eq('reservation_id', reservationId)
    .eq('service_date', morning)
    .maybeSingle()

  let menu: ScanResult['menu'] = null
  if (booking?.menu_code) {
    const { data: m } = await db
      .from('breakfast_menus')
      .select('code, name_de, name_en')
      .eq('code', booking.menu_code)
      .maybeSingle()
    if (m) menu = { code: String(m.code), name: pick(locale, String(m.name_de), String(m.name_en)) }
  }

  let slot: ScanResult['slot'] = null
  if (booking?.slot_id != null) {
    const { data: s } = await db
      .from('breakfast_slots')
      .select('starts_at, ends_at')
      .eq('id', booking.slot_id)
      .maybeSingle()
    if (s) slot = { startsAt: String(s.starts_at).slice(0, 5), endsAt: String(s.ends_at).slice(0, 5) }
  }

  // Paid but never chose a menu. Let them in — they paid — and show staff that
  // there is no menu on file so they can hand over whatever is on today.
  if (!booking) {
    await log('no_booking', { reservation_id: reservationId, guest, persons: paid.persons })
    return { ok: true, result: 'no_booking', guest, room, persons: paid.persons, menu: null, slot: null }
  }

  if (booking.attended_at) {
    await log('already', {
      reservation_id: reservationId, guest, persons: paid.persons, menu_code: booking.menu_code,
    })
    return {
      ok: true, result: 'already', guest, room, menu, slot,
      persons: paid.persons, attendedAt: String(booking.attended_at),
    }
  }

  const now = new Date().toISOString()
  await db
    .from('breakfast_bookings')
    .update({ attended_at: now, attended_persons: paid.persons, updated_at: now })
    .eq('id', booking.id)

  await log('ok', {
    reservation_id: reservationId, guest, persons: paid.persons, menu_code: booking.menu_code,
  })

  return { ok: true, result: 'ok', guest, room, menu, slot, persons: paid.persons, attendedAt: now }
}
