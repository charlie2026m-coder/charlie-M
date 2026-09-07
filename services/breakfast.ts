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
import {
  addDays,
  nightToMorning,
  morningToNight,
  breakfastMorningsForStay,
} from '@/lib/breakfastDates'
import {
  buildBreakfastReminder,
  deliverBreakfastMenuInvite,
  sendGuestwayMessage,
} from '@/services/guestway/sendGuestwayMessage'
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

// The night/morning mapping lives in lib/breakfastDates.ts so the booking
// modal can use the same one without pulling supabase-js into the browser.
// Re-exported here because callers of this module expect it.
export { addDays, nightToMorning, morningToNight, breakfastMorningsForStay }

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
      const morning = nightToMorning(night)
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
  /** Emoji shown beside the name. Recognised before the word is read, which is
   *  what separates four menus on a phone. Empty is fine — the UI just omits it. */
  icon: string
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
  /** How many of the party take each menu, e.g. { A: 1, B: 1 }. Empty until
   *  the guest has chosen. Sums to `persons` once the choice is complete. */
  chosenMenus: Record<string, number>
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

/** Portions across all menus of one morning. */
export const sumPortions = (menus: Record<string, number>): number =>
  Object.values(menus).reduce((total, n) => total + (Number(n) || 0), 0)

/** Portions with the rubbish removed: whole positive counts only. */
export function normalisePortions(menus: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [code, raw] of Object.entries(menus ?? {})) {
    const n = Math.floor(Number(raw))
    if (!Number.isFinite(n) || n <= 0) continue
    out[code] = n
  }
  return out
}

/** One morning's choice, as it arrives from the booking flow. */
export interface BreakfastChoice {
  morning: string
  menus: Record<string, number>
}

/**
 * Which choices may actually be written.
 *
 * Three rules, and a choice failing any of them is dropped rather than
 * corrected: breakfast has to be paid for that morning, the menus have to be
 * on the calendar for it, and the portions have to add up to the people who
 * paid. Guessing at a half-made choice would put a stranger's breakfast on the
 * kitchen's list; dropping it leaves the guest to finish from their link.
 *
 * Pure, so the rules can be tested without a database.
 */
export function acceptableChoices(
  choices: BreakfastChoice[],
  paidByMorning: Map<string, number>,
  offeredByMorning: Map<string, Set<string>>,
): { morning: string; persons: number; menus: Record<string, number> }[] {
  const out: { morning: string; persons: number; menus: Record<string, number> }[] = []
  const seen = new Set<string>()

  for (const choice of choices ?? []) {
    const morning = String(choice?.morning ?? '')
    if (!morning || seen.has(morning)) continue

    const persons = paidByMorning.get(morning)
    if (!persons) continue

    const menus = normalisePortions(choice?.menus ?? {})
    const codes = Object.keys(menus)
    if (codes.length === 0 || sumPortions(menus) !== persons) continue

    const onOffer = offeredByMorning.get(morning)
    if (!onOffer || codes.some(code => !onOffer.has(code))) continue

    seen.add(morning)
    out.push({ morning, persons, menus })
  }

  return out
}

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

  // The menu split lives one table down, so a party can take the eggs and the
  // vegan bowl on the same morning.
  const splitByDate = new Map<string, Record<string, number>>()
  const bookingIds = (bookings ?? []).map(b => Number(b.id)).filter(Number.isFinite)
  if (bookingIds.length > 0) {
    const { data: split } = await db
      .from('breakfast_booking_menus')
      .select('booking_id, menu_code, persons')
      .in('booking_id', bookingIds)
    const dateOfBooking = new Map(
      (bookings ?? []).map(b => [Number(b.id), String(b.service_date).slice(0, 10)]),
    )
    for (const row of split ?? []) {
      const date = dateOfBooking.get(Number(row.booking_id))
      if (!date) continue
      const bucket = splitByDate.get(date) ?? {}
      bucket[String(row.menu_code)] = Number(row.persons ?? 0)
      splitByDate.set(date, bucket)
    }
  }

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
          icon: String(m!.icon ?? ''),
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
      chosenMenus: mine ? (splitByDate.get(morning) ?? {}) : {},
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
    needsChoice: mornings.some(
      m =>
        m.menus.length > 0 &&
        (m.chosenSlot == null || sumPortions(m.chosenMenus) !== m.persons),
    ),
  }
}

export interface MorningMenus {
  morning: string
  menus: MenuView[]
}

/**
 * Which menus are served on each morning of a range.
 *
 * Used by the booking modal, where there is no reservation yet and nothing to
 * personalise — it answers only "what is on that day". Mornings with no menus
 * are still returned, so the modal can say "no breakfast served" rather than
 * silently dropping a date the guest is being charged for.
 */
export async function menusForRange(
  from: string,
  to: string,
  locale = 'en',
): Promise<MorningMenus[]> {
  const db = admin()
  const [{ data: menus }, { data: days }] = await Promise.all([
    db.from('breakfast_menus').select('*').eq('is_active', true).order('sort_order'),
    db.from('breakfast_menu_days').select('service_date, menu_code').gte('service_date', from).lte('service_date', to),
  ])

  const byCode = new Map((menus ?? []).map(m => [String(m.code), m]))
  const offered = new Map<string, string[]>()
  for (const d of days ?? []) {
    const key = String(d.service_date).slice(0, 10)
    offered.set(key, [...(offered.get(key) ?? []), String(d.menu_code)])
  }

  const out: MorningMenus[] = []
  for (let d = from, i = 0; d <= to && i < 366; d = addDays(d, 1), i++) {
    out.push({
      morning: d,
      menus: (offered.get(d) ?? [])
        .map(code => byCode.get(code))
        .filter(Boolean)
        .map(m => ({
          code: String(m!.code),
          icon: String(m!.icon ?? ''),
          name: pick(locale, String(m!.name_de), String(m!.name_en)),
          description: pick(locale, String(m!.description_de), String(m!.description_en)),
          items: toLines(pick(locale, String(m!.items_de), String(m!.items_en))),
          allergens: pick(locale, String(m!.allergens_de), String(m!.allergens_en)),
          photoUrl: (m!.photo_url as string | null) ?? null,
        })),
    })
  }
  return out
}

// ── Choosing ────────────────────────────────────────────────────────────────

export type ChooseResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'unknown_token'
        | 'not_paid'
        | 'menu_not_offered'
        | 'menu_total_mismatch'
        | 'slot_full'
        | 'slot_not_found'
        | 'past'
        | 'error'
      detail?: string
    }

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
  menus: Record<string, number>,
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

  // Normalised before anything is checked: a code with no portions is not a
  // choice, and the count has to be a whole positive number of people.
  const wanted = normalisePortions(menus ?? {})
  const codes = Object.keys(wanted)
  if (codes.length === 0) return { ok: false, reason: 'menu_not_offered' }

  // Every portion accounted for. The RPC checks this too — this is the one that
  // gets to answer with a reason the guest can act on.
  if (sumPortions(wanted) !== paid.persons) return { ok: false, reason: 'menu_total_mismatch' }

  const { data: offered } = await db
    .from('breakfast_menu_days')
    .select('menu_code')
    .eq('service_date', morning)
    .in('menu_code', codes)
  if ((offered ?? []).length !== codes.length) return { ok: false, reason: 'menu_not_offered' }

  const { error } = await db.rpc('book_breakfast_slot', {
    p_reservation_id: reservationId,
    p_service_date: morning,
    p_persons: paid.persons,
    p_menus: wanted,
    p_slot_id: slotId,
  })

  if (error) {
    const msg = String(error.message || '')
    if (msg.includes('slot_full')) return { ok: false, reason: 'slot_full' }
    if (msg.includes('slot_not_found')) return { ok: false, reason: 'slot_not_found' }
    if (msg.includes('menu_total_mismatch')) return { ok: false, reason: 'menu_total_mismatch' }
    bfLog.error('choose failed', { reservationId, morning, error: msg })
    return { ok: false, reason: 'error', detail: msg.slice(0, 200) }
  }

  return { ok: true }
}

/**
 * Write the menus the guest picked while booking.
 *
 * The booking modal collects a menu per morning, but at that moment there is no
 * reservation to attach it to — Apaleo only creates one once Adyen has taken
 * the money. So the choice rides along on the reservation payload as a
 * server-only field and lands here, called from both booking paths once the
 * reservation ids are known.
 *
 * No sitting is recorded: which sitting a guest takes is theirs to choose,
 * months later, from the link we send. That is also why this does not go
 * through book_breakfast_slot — there is no seat to lock, so there is no race
 * to protect against, and a booking row with a null slot is exactly the state
 * "menu chosen, time still open".
 *
 * Never throws: the money is already taken and the reservation already exists.
 * A breakfast the guest has to pick again is a nuisance; an exception here
 * would be a rollback of a paid stay.
 */
export async function applyBreakfastChoice(
  reservationId: string,
  choices: BreakfastChoice[],
): Promise<{ applied: number }> {
  try {
    if (!reservationId || !Array.isArray(choices) || choices.length === 0) return { applied: 0 }

    const reservation = await loadReservation(reservationId)
    if (!reservation) return { applied: 0 }

    const paidByMorning = new Map(paidBreakfastMornings(reservation).map(p => [p.morning, p.persons]))
    if (paidByMorning.size === 0) return { applied: 0 }

    const dates = [...new Set(choices.map(c => String(c?.morning ?? '')).filter(Boolean))]
    if (dates.length === 0) return { applied: 0 }

    const db = admin()
    const { data: offeredRows } = await db
      .from('breakfast_menu_days')
      .select('service_date, menu_code')
      .in('service_date', dates)

    const offeredByMorning = new Map<string, Set<string>>()
    for (const row of offeredRows ?? []) {
      const date = String(row.service_date).slice(0, 10)
      const set = offeredByMorning.get(date) ?? new Set<string>()
      set.add(String(row.menu_code))
      offeredByMorning.set(date, set)
    }

    const accepted = acceptableChoices(choices, paidByMorning, offeredByMorning)
    if (accepted.length === 0) return { applied: 0 }

    let applied = 0
    for (const choice of accepted) {
      const now = new Date().toISOString()

      // Read before write so an existing row keeps its sitting: the guest may
      // have chosen a time already and this must not take it away.
      const { data: existing } = await db
        .from('breakfast_bookings')
        .select('id')
        .eq('reservation_id', reservationId)
        .eq('service_date', choice.morning)
        .maybeSingle()

      let bookingId = existing?.id != null ? Number(existing.id) : null
      if (bookingId != null) {
        await db
          .from('breakfast_bookings')
          .update({ persons: choice.persons, updated_at: now })
          .eq('id', bookingId)
      } else {
        const { data: inserted, error } = await db
          .from('breakfast_bookings')
          .insert({
            reservation_id: reservationId,
            service_date: choice.morning,
            persons: choice.persons,
          })
          .select('id')
          .single()
        if (error || !inserted) {
          bfLog.warn('apply: could not create booking row', {
            reservationId,
            morning: choice.morning,
            error: error?.message,
          })
          continue
        }
        bookingId = Number(inserted.id)
      }

      await db.from('breakfast_booking_menus').delete().eq('booking_id', bookingId)
      const { error: menusError } = await db.from('breakfast_booking_menus').insert(
        Object.entries(choice.menus).map(([menu_code, persons]) => ({
          booking_id: bookingId,
          menu_code,
          persons,
        })),
      )
      if (menusError) {
        bfLog.warn('apply: could not write menus', {
          reservationId,
          morning: choice.morning,
          error: menusError.message,
        })
        continue
      }
      applied++
    }

    // The link the guest opens to pick a sitting — and the QR they show at the
    // door — both hang off this token, so it exists from the moment there is
    // anything to show.
    if (applied > 0) await ensureBreakfastToken(reservationId)

    bfLog.info('apply: menus written', { reservationId, applied, offered: choices.length })
    return { applied }
  } catch (e) {
    bfLog.error('apply: failed', {
      reservationId,
      error: e instanceof Error ? e.message : String(e),
    })
    return { applied: 0 }
  }
}

/**
 * Invite a guest to choose their breakfast, through Guestway.
 *
 * Only when there is something to choose: no breakfast on the booking, or every
 * morning already settled, and the guest hears nothing. A message telling
 * somebody to pick a menu they have already picked is the kind of thing that
 * teaches guests to ignore us.
 *
 * Best-effort and never throws — it runs after the money is taken, and the
 * guest can still reach the page from their booking either way.
 */
export async function sendBreakfastMenuInvite(
  reservationId: string,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!reservationId) return { sent: false, reason: 'no_reservation' }

    const token = await ensureBreakfastToken(reservationId)
    const view = await guestView(token, 'en')
    if (!view || view.mornings.length === 0) return { sent: false, reason: 'no_breakfast' }
    if (!view.needsChoice) return { sent: false, reason: 'already_chosen' }

    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.charlie-m.de').replace(/\/+$/, '')
    const sent = await deliverBreakfastMenuInvite(
      reservationId,
      `${base}/breakfast/${token}`,
      view.mornings.length,
      opts,
    )
    return { sent }
  } catch (e) {
    bfLog.error('invite failed', {
      reservationId,
      error: e instanceof Error ? e.message : String(e),
    })
    return { sent: false, reason: 'error' }
  }
}

// ── The kitchen ─────────────────────────────────────────────────────────────

export interface KitchenLine {
  reservationId: string
  guest: string
  room: string
  /** People this reservation has breakfast for on this morning. */
  persons: number
  /** Empty when the guest never picked — the kitchen still has to feed them. */
  menus: { code: string; name: string; icon: string; persons: number }[]
  slot: { id: number; startsAt: string; endsAt: string } | null
  attendedPersons: number | null
}

export interface KitchenReport {
  morning: string
  /** Everyone breakfast is paid for. This is the number to cook to. */
  covers: number
  /** Of those, how many have a menu on file. */
  chosen: number
  byMenu: { code: string; name: string; icon: string; persons: number }[]
  bySitting: {
    id: number | null
    label: string
    persons: number
    menus: { code: string; persons: number }[]
  }[]
  lines: KitchenLine[]
}

interface ApaleoReservationsPage {
  count?: number
  reservations?: unknown[]
}

/**
 * Every reservation staying the night before `morning`, with its services.
 *
 * Paged because the house is 125 rooms and Apaleo caps a page at 100. Cancelled
 * and no-show reservations are dropped here rather than through a status
 * filter: the filter takes one status at a time, and asking for the three that
 * count would be three round trips to exclude two.
 */
async function reservationsStayingOn(night: string): Promise<ApaleoReservationResponse[]> {
  const out: ApaleoReservationResponse[] = []
  const PAGE = 100
  const MAX_PAGES = 6

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      propertyIds: propertyId(),
      dateFilter: 'Stay',
      from: `${night}T00:00:00Z`,
      to: `${night}T23:59:59Z`,
      pageNumber: String(page),
      pageSize: String(PAGE),
      expand: 'services',
    })
    // URLSearchParams collapses repeats of the same key, and Apaleo wants one
    // `expand` per value.
    const url = `/booking/v1/reservations?${params}&expand=primaryGuest&expand=unit`

    let res: ApaleoReservationsPage | null = null
    try {
      res = await Fetch<ApaleoReservationsPage>(url)
    } catch (e) {
      bfLog.error('kitchen: reservation page failed', {
        night,
        page,
        error: e instanceof Error ? e.message : String(e),
      })
      break
    }

    const items = Array.isArray(res?.reservations) ? res.reservations : []
    for (const item of items) {
      const r = item as ApaleoReservationResponse & { status?: string }
      const status = String(r?.status ?? '')
      if (status === 'Canceled' || status === 'NoShow') continue
      out.push(r)
    }

    if (items.length < PAGE) break
  }

  return out
}

/**
 * What the kitchen cooks tomorrow.
 *
 * Two sources, and the difference between them is the point. Apaleo says who
 * has PAID for breakfast that morning — that is the number of covers, and it
 * includes every guest who never opened their link. Our own tables say who
 * picked WHAT, and at which sitting. A report built from our tables alone would
 * quietly under-cater by exactly the guests who could not be bothered to
 * choose, which is the one mistake a breakfast service cannot recover from.
 *
 * So every paid reservation appears, and the ones with no choice are shown as
 * such rather than left out.
 */
export async function kitchenReport(morning: string, locale = 'en'): Promise<KitchenReport> {
  const empty: KitchenReport = {
    morning,
    covers: 0,
    chosen: 0,
    byMenu: [],
    bySitting: [],
    lines: [],
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(morning)) return empty

  const night = morningToNight(morning)
  const reservations = await reservationsStayingOn(night)

  const paidLines = reservations
    .map(r => {
      const paid = paidBreakfastMornings(r).find(p => p.morning === morning)
      if (!paid) return null
      const withIds = r as ApaleoReservationResponse & {
        id?: string
        unit?: { name?: string }
        primaryGuest?: { firstName?: string; lastName?: string }
      }
      const guest = [withIds.primaryGuest?.firstName, withIds.primaryGuest?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
      return {
        reservationId: String(withIds.id ?? ''),
        guest,
        room: String(withIds.unit?.name ?? ''),
        persons: paid.persons,
      }
    })
    .filter((x): x is { reservationId: string; guest: string; room: string; persons: number } =>
      Boolean(x?.reservationId),
    )

  if (paidLines.length === 0) return empty

  const db = admin()
  const ids = paidLines.map(l => l.reservationId)

  const [{ data: bookings }, { data: menus }, { data: slots }] = await Promise.all([
    db
      .from('breakfast_bookings')
      .select('id, reservation_id, slot_id, attended_persons')
      .eq('service_date', morning)
      .in('reservation_id', ids),
    db.from('breakfast_menus').select('code, icon, name_de, name_en').order('sort_order'),
    db.from('breakfast_slots').select('id, starts_at, ends_at').order('sort_order'),
  ])

  const bookingIds = (bookings ?? []).map(b => Number(b.id)).filter(Number.isFinite)
  const { data: split } = bookingIds.length
    ? await db
        .from('breakfast_booking_menus')
        .select('booking_id, menu_code, persons')
        .in('booking_id', bookingIds)
    : { data: [] as { booking_id: number; menu_code: string; persons: number }[] }

  const menuInfo = new Map(
    (menus ?? []).map(m => [
      String(m.code),
      { name: pick(locale, String(m.name_de), String(m.name_en)), icon: String(m.icon ?? '') },
    ]),
  )
  const slotInfo = new Map(
    (slots ?? []).map(s => [
      Number(s.id),
      { startsAt: String(s.starts_at).slice(0, 5), endsAt: String(s.ends_at).slice(0, 5) },
    ]),
  )

  const splitByBooking = new Map<number, { code: string; persons: number }[]>()
  for (const row of split ?? []) {
    const key = Number(row.booking_id)
    const list = splitByBooking.get(key) ?? []
    list.push({ code: String(row.menu_code), persons: Number(row.persons ?? 0) })
    splitByBooking.set(key, list)
  }

  const bookingByReservation = new Map((bookings ?? []).map(b => [String(b.reservation_id), b]))

  const lines: KitchenLine[] = paidLines.map(line => {
    const booking = bookingByReservation.get(line.reservationId)
    const chosen = booking ? (splitByBooking.get(Number(booking.id)) ?? []) : []
    const slotId = booking?.slot_id != null ? Number(booking.slot_id) : null
    const slot = slotId != null ? slotInfo.get(slotId) : undefined
    return {
      ...line,
      menus: chosen
        .map(c => ({
          code: c.code,
          name: menuInfo.get(c.code)?.name ?? c.code,
          icon: menuInfo.get(c.code)?.icon ?? '',
          persons: c.persons,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      slot: slot && slotId != null ? { id: slotId, ...slot } : null,
      attendedPersons:
        booking?.attended_persons != null ? Number(booking.attended_persons) : null,
    }
  })

  lines.sort((a, b) => (a.slot?.startsAt ?? '~').localeCompare(b.slot?.startsAt ?? '~') || a.room.localeCompare(b.room))

  const byMenuCount = new Map<string, number>()
  const bySittingCount = new Map<string, { persons: number; menus: Map<string, number> }>()

  for (const line of lines) {
    const key = line.slot ? String(line.slot.id) : 'none'
    const bucket = bySittingCount.get(key) ?? { persons: 0, menus: new Map<string, number>() }
    bucket.persons += line.persons
    for (const m of line.menus) {
      byMenuCount.set(m.code, (byMenuCount.get(m.code) ?? 0) + m.persons)
      bucket.menus.set(m.code, (bucket.menus.get(m.code) ?? 0) + m.persons)
    }
    bySittingCount.set(key, bucket)
  }

  const covers = lines.reduce((total, l) => total + l.persons, 0)
  const chosen = lines.reduce((total, l) => total + sumPortions(Object.fromEntries(l.menus.map(m => [m.code, m.persons]))), 0)

  const bySitting = [...bySittingCount.entries()]
    .map(([key, bucket]) => {
      const id = key === 'none' ? null : Number(key)
      const info = id != null ? slotInfo.get(id) : undefined
      return {
        id,
        label: info ? `${info.startsAt}–${info.endsAt}` : 'No time chosen',
        persons: bucket.persons,
        menus: [...bucket.menus.entries()]
          .map(([code, persons]) => ({ code, persons }))
          .sort((a, b) => a.code.localeCompare(b.code)),
      }
    })
    .sort((a, b) => (a.id == null ? 1 : b.id == null ? -1 : a.label.localeCompare(b.label)))

  const byMenu = [...byMenuCount.entries()]
    .map(([code, persons]) => ({
      code,
      name: menuInfo.get(code)?.name ?? code,
      icon: menuInfo.get(code)?.icon ?? '',
      persons,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))

  return { morning, covers, chosen, byMenu, bySitting, lines }
}

export interface ReminderRun {
  morning: string
  /** Reservations with breakfast tomorrow and something still unchosen. */
  candidates: number
  sent: number
  /** Already nudged for this morning on an earlier run. */
  skipped: number
  failed: number
}

/**
 * Remind everyone eating tomorrow who has not chosen.
 *
 * "Not chosen" is either half missing: no menu, or a menu with no sitting. The
 * sitting is not a formality — it is the seat, and an unspread house is how
 * thirty guests arrive at 09:00 for twelve chairs.
 *
 * The kitchen sheet already answers "who is eating tomorrow, and what did they
 * pick", including the guests with no booking row at all, so this reuses it
 * rather than sweeping Apaleo a second way and disagreeing with it.
 *
 * One message per reservation per morning, recorded before it can be sent
 * again: a five-night guest who never opens the link would otherwise be told
 * five evenings running, and the fifth is the one that teaches them to ignore
 * us. A send that fails is NOT recorded, so tomorrow's run tries once more.
 *
 * Single attempt, no polling: unlike a fresh booking, the conversation has
 * existed for as long as the booking has.
 */
export async function remindUnchosenBreakfast(morning: string): Promise<ReminderRun> {
  const run: ReminderRun = { morning, candidates: 0, sent: 0, skipped: 0, failed: 0 }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(morning)) return run

  const report = await kitchenReport(morning, 'en')
  const candidates = report.lines.filter(line => line.menus.length === 0 || line.slot === null)
  run.candidates = candidates.length
  if (candidates.length === 0) return run

  const db = admin()
  const { data: already } = await db
    .from('breakfast_reminders')
    .select('reservation_id')
    .eq('service_date', morning)
    .in(
      'reservation_id',
      candidates.map(c => c.reservationId),
    )
  const done = new Set((already ?? []).map(r => String(r.reservation_id)))

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.charlie-m.de').replace(/\/+$/, '')

  for (const line of candidates) {
    if (done.has(line.reservationId)) {
      run.skipped++
      continue
    }
    try {
      const token = await ensureBreakfastToken(line.reservationId)
      const result = await sendGuestwayMessage({
        reservationId: line.reservationId,
        body: buildBreakfastReminder(`${base}/breakfast/${token}`),
      })
      if (!result.success) {
        run.failed++
        continue
      }
      // Recorded only after it actually went out.
      await db
        .from('breakfast_reminders')
        .upsert(
          { reservation_id: line.reservationId, service_date: morning },
          { onConflict: 'reservation_id,service_date' },
        )
      run.sent++
    } catch (e) {
      run.failed++
      bfLog.error('reminder failed', {
        reservationId: line.reservationId,
        morning,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  bfLog.info('reminder run', run as unknown as Record<string, unknown>)
  return run
}

// ── The door ────────────────────────────────────────────────────────────────

export interface ScanResult {
  ok: boolean
  result: 'ok' | 'already' | 'no_booking' | 'not_paid' | 'unknown_token' | 'error'
  guest?: string
  room?: string
  /** What the party eats, one entry per menu they picked. */
  menus?: { code: string; name: string; icon: string; persons: number }[]
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
    .select('id, slot_id, attended_at, persons')
    .eq('reservation_id', reservationId)
    .eq('service_date', morning)
    .maybeSingle()

  // The person holding the scanner needs the whole party's order, not one dish:
  // a couple can have taken one of each.
  const menus: NonNullable<ScanResult['menus']> = []
  if (booking?.id) {
    const { data: split } = await db
      .from('breakfast_booking_menus')
      .select('menu_code, persons')
      .eq('booking_id', booking.id)
    const codes = (split ?? []).map(r => String(r.menu_code))
    const { data: named } = codes.length
      ? await db.from('breakfast_menus').select('code, icon, name_de, name_en').in('code', codes)
      : { data: [] as { code: string; icon: string; name_de: string; name_en: string }[] }
    // The door screen draws the same icon the guest saw when they chose, so it
    // comes from the menu row rather than a second copy of the mapping.
    const shown = new Map(
      (named ?? []).map(m => [
        String(m.code),
        { name: pick(locale, String(m.name_de), String(m.name_en)), icon: String(m.icon ?? '') },
      ]),
    )
    for (const row of split ?? []) {
      const code = String(row.menu_code)
      const info = shown.get(code)
      menus.push({
        code,
        name: info?.name ?? code,
        icon: info?.icon ?? '',
        persons: Number(row.persons ?? 0),
      })
    }
    menus.sort((a, b) => a.code.localeCompare(b.code))
  }

  /** "2x A, 1x B" — the log is read by a human, not joined against. */
  const menuSummary = menus.length
    ? menus.map(m => `${m.persons}x ${m.code}`).join(', ')
    : null

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
    return { ok: true, result: 'no_booking', guest, room, persons: paid.persons, menus: [], slot: null }
  }

  if (booking.attended_at) {
    await log('already', {
      reservation_id: reservationId, guest, persons: paid.persons, menu_code: menuSummary,
    })
    return {
      ok: true, result: 'already', guest, room, menus, slot,
      persons: paid.persons, attendedAt: String(booking.attended_at),
    }
  }

  const now = new Date().toISOString()
  await db
    .from('breakfast_bookings')
    .update({ attended_at: now, attended_persons: paid.persons, updated_at: now })
    .eq('id', booking.id)

  await log('ok', {
    reservation_id: reservationId, guest, persons: paid.persons, menu_code: menuSummary,
  })

  return { ok: true, result: 'ok', guest, room, menus, slot, persons: paid.persons, attendedAt: now }
}
