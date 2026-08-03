/**
 * QR Self-Checkout: guests check themselves out on departure day.
 *
 * One static unguessable token per room (Apaleo unit). The QR code points to
 * /checkout/{token}. The public page checks whether that room currently has an
 * InHouse reservation, shows guest name + room and a confirm button. On
 * confirm the reservation is checked out via Apaleo.
 *
 * Policy (port of HotelCheck self_checkout.py — keep in sync conceptually):
 *   - Only blocked when status != InHouse (safety re-check; already departed
 *     or cancelled). An open balance does NOT block — automated hotel without
 *     reception, payment runs separately.
 *   - Early checkout (departure >= EARLY_CHECKOUT_CONFIRM_DAYS away) must be
 *     acknowledged server-side via early_ack — the rule lives here, not just
 *     in the frontend popup.
 *   - Tokens are unguessable (72 bits) and static: a re-run of generateTokens
 *     must NEVER rotate existing tokens — printed QR codes are physical.
 *
 * Apaleo (all via Fetch from services/Request):
 *   GET /inventory/v1/units?propertyId=…                  (room list)
 *   GET /booking/v1/reservations?unitIds&dateFilter=Stay  (current InHouse)
 *   GET /booking/v1/reservations/{id}                     (balance/guest)
 *   PUT /booking/v1/reservation-actions/{id}/checkout     (reservations.manage)
 */

import crypto from 'crypto'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { createClient } from '@supabase/supabase-js'
import { Fetch } from '@/services/Request'
import { logger } from '@/lib/logger'
import { releaseRoomAfterEarlyCheckout } from '@/services/apaleo/releaseRoomEarly'

const scoLog = logger.withTag('self-checkout')

export const EARLY_CHECKOUT_CONFIRM_DAYS = 2
export const EARLY_CHECKOUT_WAIT_SECONDS = 3
// Reserved demo tokens: simulate a run-through but NEVER check anything real
// out and never write to the audit log.
export const DEMO_TOKEN = 'demo'
export const DEMO_EARLY_TOKEN = 'demo-early'

// ── Types ────────────────────────────────────────────────────────────────────

interface ApaleoUnitsResponse {
  units?: { id?: string; name?: string }[]
}

interface ApaleoReservationHead {
  id?: string
  status?: string
  departure?: string
  unit?: { id?: string }
  assignedUnits?: { unit?: { id?: string } }[]
}

export interface ApaleoReservationLike extends ApaleoReservationHead {
  primaryGuest?: { firstName?: string; lastName?: string }
  balance?: { amount?: number; currency?: string }
  channelCode?: string
  property?: { id?: string }
}

interface ApaleoReservationsResponse {
  reservations?: ApaleoReservationHead[]
}

export interface Evaluation {
  can_checkout: boolean
  reason: string
  guest: string
  balance: number
  currency: string
  channel: string
  departure: string
  days_until: number
  early: boolean
  status: string
}

/** JSON contract shared with the guest page — mirrors HotelCheck verbatim. */
export interface SelfCheckoutResult {
  ok: boolean
  state?: 'ready' | 'no_departure' | 'blocked' | 'needs_confirm' | 'done' | 'invalid' | 'error'
  msg?: string
  room?: string
  reservation_id?: string
  guest?: string
  balance?: number
  currency?: string
  channel?: string
  departure?: string
  days_until?: number
  early?: boolean
  status?: string
  can_checkout?: boolean
  reason?: string
  wait_seconds?: number
  demo?: boolean
}

interface TokenRow {
  token: string
  property_id: string
  unit_id: string
  unit_name: string
}

// ── Supabase (service role) ──────────────────────────────────────────────────
// The public guest route has no user session and the tables have no write
// policies by design — all writes go through service_role.

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function propertyId(): string {
  return process.env.APALEO_PROPERTY_ID || 'CMH'
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** Today's date (YYYY-MM-DD) in the hotel's timezone. */
export function todayBerlin(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now)
}

function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10)
}

/** Unguessable static token, equivalent of Python's secrets.token_urlsafe(9). */
export function newToken(): string {
  return crypto.randomBytes(9).toString('base64url')
}

function guestName(resv: ApaleoReservationLike): string {
  const g = resv.primaryGuest || {}
  const name = [g.firstName, g.lastName].filter(Boolean).join(' ').trim()
  return name || 'Gast'
}

/**
 * Apply the self-checkout policy to a (full) reservation.
 *
 * An open balance does NOT block: automated hotel without reception, checkout
 * must always be possible. The only block is status != InHouse.
 */
export function evaluate(resv: ApaleoReservationLike, today: string): Evaluation {
  const status = String(resv.status || '')
  const rawBalance = resv.balance?.amount
  const balance = typeof rawBalance === 'number' ? rawBalance : 0
  const channel = String(resv.channelCode || '')

  let can = true
  let reason = ''
  if (status !== 'InHouse') {
    can = false
    reason = 'not_inhouse'
  }

  const departure = String(resv.departure || '').slice(0, 10)
  const depMs = Date.parse(`${departure}T00:00:00Z`)
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  let daysUntil =
    Number.isNaN(depMs) || Number.isNaN(todayMs) ? 0 : Math.round((depMs - todayMs) / 86_400_000)
  if (daysUntil < 0) daysUntil = 0

  return {
    can_checkout: can,
    reason,
    guest: guestName(resv),
    balance: Math.round(balance * 100) / 100,
    currency: String(resv.balance?.currency || 'EUR'),
    channel,
    departure,
    days_until: daysUntil,
    early: daysUntil >= EARLY_CHECKOUT_CONFIRM_DAYS,
    status,
  }
}

// ── Apaleo ───────────────────────────────────────────────────────────────────

/** All units of the property (paginated, hard cap 30 pages). */
export async function listUnits(): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = []
  let page = 1
  for (;;) {
    const res = await Fetch<ApaleoUnitsResponse>(
      `/inventory/v1/units?propertyId=${encodeURIComponent(propertyId())}&pageNumber=${page}&pageSize=100`
    )
    const items = res?.units
    if (!Array.isArray(items) || items.length === 0) break
    for (const u of items) {
      if (u?.id) out.push({ id: String(u.id), name: String(u.name || u.id) })
    }
    if (items.length < 100) break
    page++
    if (page > 30) break
  }
  return out
}

/**
 * Currently checked-in (InHouse) reservation in this room — departing today
 * OR later (dateFilter=Stay so an early checkout is possible too). A room has
 * at most one InHouse reservation at a time; the JS re-filter is
 * belt-and-braces.
 */
export async function findCurrentInhouse(
  unitId: string,
  today: string
): Promise<ApaleoReservationHead | null> {
  const params = new URLSearchParams({
    propertyIds: propertyId(),
    unitIds: unitId,
    dateFilter: 'Stay',
    from: `${today}T00:00:00Z`,
    to: `${today}T23:59:59Z`,
    status: 'InHouse',
    pageSize: '50',
  })
  const res = await Fetch<ApaleoReservationsResponse>(`/booking/v1/reservations?${params}`)
  const items = res?.reservations
  if (!Array.isArray(items)) return null
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    if (String(it.status) !== 'InHouse') continue
    if (String(it.departure || '').slice(0, 10) < today) continue // already over → safety skip
    const uid = String(it.unit?.id || '')
    const assigned = (it.assignedUnits || []).map((x) => String(x?.unit?.id || ''))
    if (![uid, ...assigned].includes(unitId)) continue
    return it
  }
  return null
}

/**
 * Full reservation. Apaleo's single-resource endpoint ignores propertyIds —
 * enforce the property here so reservations from the other hotel (shared
 * Apaleo account) are never surfaced (same guard as services/getReservation).
 */
export async function fullReservation(rid: string): Promise<ApaleoReservationLike | null> {
  const resv = await Fetch<ApaleoReservationLike>(
    `/booking/v1/reservations/${encodeURIComponent(rid)}`
  )
  if (!resv || resv.property?.id !== propertyId()) return null
  return resv
}

// ── Token + audit-log persistence ────────────────────────────────────────────

async function getTokenRow(token: string): Promise<TokenRow | null> {
  const { data, error } = await createAdminClient()
    .from('self_checkout_tokens')
    .select('token, property_id, unit_id, unit_name')
    .eq('token', token)
    .maybeSingle()
  if (error) {
    scoLog.error('token lookup failed:', error.message)
    throw new Error('token lookup failed')
  }
  return data
}

/** Audit log insert — must never break the checkout flow. */
async function recordLog(entry: {
  token: string
  reservation_id?: string
  unit_id?: string
  guest?: string
  result: string
}): Promise<void> {
  const { error } = await createAdminClient().from('self_checkout_log').insert(entry)
  if (error) scoLog.warn('audit log insert failed:', error.message)
}

/**
 * Fetch all units of the property and ensure each has a token. Existing
 * tokens are NEVER rotated (ignoreDuplicates on the unit conflict) — printed
 * QR codes must stay valid. Renamed units get their unit_name refreshed.
 */
export async function generateTokens(): Promise<{ ok: true; units: number; created: number }> {
  const units = await listUnits()
  const db = createAdminClient()

  const { data: existing, error: readError } = await db
    .from('self_checkout_tokens')
    .select('unit_id, unit_name')
    .eq('property_id', propertyId())
  if (readError) throw new Error(`token read failed: ${readError.message}`)

  const known = new Map((existing || []).map((r) => [r.unit_id as string, r.unit_name as string]))

  const rows = units.map((u) => ({
    token: newToken(),
    property_id: propertyId(),
    unit_id: u.id,
    unit_name: u.name,
  }))
  if (rows.length > 0) {
    const { error } = await db
      .from('self_checkout_tokens')
      .upsert(rows, { onConflict: 'property_id,unit_id', ignoreDuplicates: true })
    if (error) throw new Error(`token upsert failed: ${error.message}`)
  }

  for (const u of units) {
    const knownName = known.get(u.id)
    if (knownName !== undefined && knownName !== u.name) {
      const { error } = await db
        .from('self_checkout_tokens')
        .update({ unit_name: u.name })
        .eq('property_id', propertyId())
        .eq('unit_id', u.id)
      if (error) scoLog.warn('unit_name refresh failed:', error.message)
    }
  }

  const created = units.filter((u) => !known.has(u.id)).length
  return { ok: true, units: units.length, created }
}

export interface TokenListItem {
  token: string
  unit_id: string
  unit_name: string
  created_at: string
}

// ── Public flows ─────────────────────────────────────────────────────────────

function demoLookup(token: string, today: string): SelfCheckoutResult {
  const early = token === DEMO_EARLY_TOKEN
  return {
    ok: true,
    state: 'ready',
    room: 'Demo 101',
    reservation_id: 'DEMO',
    guest: 'Max Mustermann',
    can_checkout: true,
    reason: '',
    balance: 0,
    currency: 'EUR',
    channel: 'Direct',
    departure: early ? addDaysIso(today, 4) : today,
    days_until: early ? 4 : 0,
    early,
    wait_seconds: EARLY_CHECKOUT_WAIT_SECONDS,
    status: 'InHouse',
    demo: true,
  }
}

/** Public preview: what does the guest page show for this QR token? */
export async function lookup(token: string): Promise<SelfCheckoutResult> {
  if (token === DEMO_TOKEN || token === DEMO_EARLY_TOKEN) {
    return demoLookup(token, todayBerlin())
  }

  let row: TokenRow | null
  try {
    row = await getTokenRow(token)
  } catch {
    return { ok: false, state: 'error', msg: 'Vorübergehender Fehler. Bitte später erneut.' }
  }
  if (!row) return { ok: false, state: 'invalid', msg: 'Ungültiger Code.' }

  const today = todayBerlin()
  let resv: ApaleoReservationLike | null
  try {
    const head = await findCurrentInhouse(row.unit_id, today)
    if (!head) {
      return {
        ok: true,
        state: 'no_departure',
        room: row.unit_name,
        msg: 'Heute ist für dieses Zimmer kein Check-out vorgesehen.',
      }
    }
    resv = await fullReservation(String(head.id))
    if (!resv) {
      return {
        ok: true,
        state: 'no_departure',
        room: row.unit_name,
        msg: 'Heute ist für dieses Zimmer kein Check-out vorgesehen.',
      }
    }
  } catch (e) {
    scoLog.error('lookup failed:', e instanceof Error ? e.message : e)
    return { ok: false, state: 'error', msg: 'Vorübergehender Fehler. Bitte später erneut.' }
  }

  const ev = evaluate(resv, today)
  return {
    ok: true,
    state: ev.can_checkout ? 'ready' : 'blocked',
    room: row.unit_name,
    reservation_id: String(resv.id),
    wait_seconds: EARLY_CHECKOUT_WAIT_SECONDS,
    ...ev,
  }
}

/** Extract the HTTP status from a services/Request Fetch error message. */
function apaleoErrorStatus(e: unknown): string {
  const m = e instanceof Error ? e.message.match(/Apaleo API error: (\d{3})/) : null
  return m ? m[1] : 'network'
}

/**
 * Public: re-validate and check out.
 *
 * earlyAck: confirmation for an early checkout (departure >=
 * EARLY_CHECKOUT_CONFIRM_DAYS away). Without it an early checkout is NOT
 * executed — needs_confirm is returned instead. The rule lives server-side,
 * not only in the frontend popup.
 */
export async function confirm(token: string, earlyAck: boolean = false): Promise<SelfCheckoutResult> {
  if (token === DEMO_TOKEN || token === DEMO_EARLY_TOKEN) {
    // Demo: never check anything real out, just show the success screen.
    return {
      ok: true,
      state: 'done',
      room: 'Demo 101',
      guest: 'Max Mustermann',
      msg: 'Demo abgeschlossen — es wurde nichts ausgecheckt.',
      demo: true,
    }
  }

  let row: TokenRow | null
  try {
    row = await getTokenRow(token)
  } catch {
    return { ok: false, state: 'error', msg: 'Vorübergehender Fehler. Bitte versuchen Sie es gleich erneut.' }
  }
  // state:'invalid' so the guest page shows the "code no longer valid" card
  // (a token deleted between page load and the button press), matching lookup().
  if (!row) return { ok: false, state: 'invalid', msg: 'Ungültiger Code.' }

  const today = todayBerlin()
  let rid = ''
  let ev: Evaluation
  try {
    const head = await findCurrentInhouse(row.unit_id, today)
    if (!head) {
      return { ok: false, state: 'no_departure', msg: 'Heute ist kein Check-out vorgesehen.' }
    }
    rid = String(head.id)
    const resv = await fullReservation(rid)
    if (!resv) {
      return { ok: false, state: 'no_departure', msg: 'Heute ist kein Check-out vorgesehen.' }
    }
    ev = evaluate(resv, today)

    if (!ev.can_checkout) {
      await recordLog({
        token,
        reservation_id: rid,
        unit_id: row.unit_id,
        guest: ev.guest,
        result: `blocked:${ev.reason}`,
      })
      return {
        ok: false,
        state: 'blocked',
        msg: 'Check-out gerade nicht möglich.',
        reason: ev.reason,
        room: row.unit_name,
        balance: ev.balance,
        currency: ev.currency,
      }
    }

    // An early checkout must be acknowledged server-side (not just via popup).
    if (ev.early && !earlyAck) {
      await recordLog({
        token,
        reservation_id: rid,
        unit_id: row.unit_id,
        guest: ev.guest,
        result: 'needs_confirm',
      })
      return {
        ok: false,
        state: 'needs_confirm',
        room: row.unit_name,
        guest: ev.guest,
        departure: ev.departure,
        days_until: ev.days_until,
        wait_seconds: EARLY_CHECKOUT_WAIT_SECONDS,
        msg: 'Frühzeitiger Check-out — bitte bestätigen.',
      }
    }

    // Early departure → hand the room back to inventory TOMORROW rather than at
    // the original departure: housekeeping runs mornings, and tomorrow also
    // leaves the guest a night of buffer (their door code follows the new
    // departure, so a mistaken tap doesn't lock them out on the spot).
    // Deliberately BEFORE the checkout — an amend needs a live reservation —
    // and strictly best-effort: it never throws, and any failure simply leaves
    // the room freeing up at the original departure, exactly as before.
    if (ev.days_until > 0) {
      await releaseRoomAfterEarlyCheckout(rid, { today, departure: ev.departure })
    }

    try {
      await Fetch(`/booking/v1/reservation-actions/${encodeURIComponent(rid)}/checkout`, {
        method: 'PUT',
      })
    } catch (e) {
      const status = apaleoErrorStatus(e)
      await recordLog({
        token,
        reservation_id: rid,
        unit_id: row.unit_id,
        guest: ev.guest,
        result: `error:${status}`,
      })
      scoLog.warn(`checkout ${rid} failed with ${status}`)
      return {
        ok: false,
        state: 'error',
        msg: 'Check-out hat nicht geklappt. Bitte melden Sie sich kurz bei uns.',
      }
    }
  } catch (e) {
    scoLog.error('confirm failed:', e instanceof Error ? e.message : e)
    return { ok: false, state: 'error', msg: 'Vorübergehender Fehler. Bitte versuchen Sie es gleich erneut.' }
  }

  await recordLog({ token, reservation_id: rid, unit_id: row.unit_id, guest: ev.guest, result: 'ok' })
  return {
    ok: true,
    state: 'done',
    room: row.unit_name,
    guest: ev.guest,
    msg: 'Erfolgreich ausgecheckt. Gute Reise!',
  }
}

// ── QR rendering: color, hotel-icon logo, SVG/PNG, ZIP ───────────────────────

const HEX_RE = /^[0-9a-fA-F]{6}$/

export function safeHex(c: unknown, fallback: string = '000000'): string {
  const v = String(c ?? '').trim().replace(/^#/, '')
  return HEX_RE.test(v) ? v : fallback
}

/**
 * Insert the hotel icon (filled building) centered into the vector QR — with
 * a white clearance zone. Geometry matches HotelCheck's PNG logo (all parts
 * scale with the building size).
 */
export function injectSvgLogo(svg: string, colorHex: string): string {
  const m = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/)
  if (!m) return svg
  const w = parseFloat(m[1])
  const cx = w / 2
  const clear = w * 0.3
  const half = clear / 2
  const b = clear * 0.72
  const sc = b / 24
  const bx = cx - b / 2

  const r2 = (n: number) => n.toFixed(2)
  let windows = ''
  for (const ry of [10.5, 14.5]) {
    for (const rx of [7.5, 11.0, 14.5]) {
      windows += `<rect x="${r2(bx + rx * sc)}" y="${r2(bx + ry * sc)}" width="${r2(2.2 * sc)}" height="${r2(2.6 * sc)}" fill="#fff"/>`
    }
  }
  const building =
    `<rect x="${r2(bx + 3.5 * sc)}" y="${r2(bx + 5 * sc)}" width="${r2(17 * sc)}" height="${r2(17 * sc)}" rx="${r2(2 * sc)}" fill="#${colorHex}"/>` +
    windows +
    `<rect x="${r2(bx + 10.4 * sc)}" y="${r2(bx + 17.5 * sc)}" width="${r2(3.2 * sc)}" height="${r2(4.5 * sc)}" fill="#fff"/>`
  const overlay =
    `<rect x="${r2(cx - half)}" y="${r2(cx - half)}" width="${r2(clear)}" height="${r2(clear)}" rx="${r2(clear * 0.18)}" fill="#ffffff"/>` +
    building
  return svg.replace('</svg>', overlay + '</svg>')
}

export function sanitizeFilename(base: string): string {
  const safe = String(base)
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
  return safe || 'qr'
}

/**
 * Render a QR as SVG (vector) or PNG, optionally colored. The hotel logo is
 * SVG-only (no native raster deps; PNG falls back to a plain QR).
 */
export async function makeQr(
  url: string,
  fmt: 'svg' | 'png' = 'svg',
  color: string = '000000',
  logo: boolean = false
): Promise<{ data: Buffer | string; mime: string }> {
  const hex = safeHex(color)
  if (fmt === 'png') {
    const data = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 16,
      color: { dark: `#${hex}`, light: '#ffffff' },
    })
    return { data, mime: 'image/png' }
  }
  let svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: logo ? 'H' : 'M',
    margin: 2,
    color: { dark: `#${hex}`, light: '#ffffff' },
  })
  if (logo) svg = injectSvgLogo(svg, hex)
  return { data: svg, mime: 'image/svg+xml' }
}

/** ZIP with one QR file per (filename base, url) pair. */
export async function makeQrZip(
  items: { base: string; url: string }[],
  fmt: 'svg' | 'png' = 'svg',
  color: string = '000000',
  logo: boolean = false
): Promise<Buffer> {
  const ext = fmt === 'png' ? 'png' : 'svg'
  const zip = new JSZip()
  const seen = new Map<string, number>()
  for (const { base, url } of items) {
    const safe = sanitizeFilename(base)
    const n = seen.get(safe) ?? 0
    seen.set(safe, n + 1)
    const fname = n === 0 ? `${safe}.${ext}` : `${safe}_${n}.${ext}`
    const { data } = await makeQr(url, fmt, color, logo)
    zip.file(fname, data)
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
