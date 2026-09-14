import { bookingLog } from '@/lib/logger'

/**
 * Has the door actually followed the arrival we wrote?
 *
 * Moving the arrival in Apaleo is a request; the door is Guestway's. Guestway
 * re-syncs the room door's code window from the reservation's arrival, and
 * that is the only observable there is for "the guest can now get in":
 * `GET /reservation-accesses` → the room door lock → `code.validFrom`.
 * Measured 2026-09-07 on live bookings: validFrom sits on whatever arrival we
 * wrote, including a non-round 14:01. A manual "extend access" in Guestway
 * moves it EARLIER still — also a door that opens, so `<=` is the test.
 *
 * Why this exists: on 2026-09-14 a guest was told "your room is ready, come
 * in" while the door was shut, and stood outside at 10:25. The word must
 * come after the door, and only after the door has been SEEN to move. Not
 * confirmed within the budget means no message — the guest still has the
 * access details Guestway sent at pre-check-in, and the hotel gets an alert.
 */
const API_URL = process.env.GUESTWAY_API_URL?.replace(/\/+$/, '')
const PARTNERSHIP_API_KEY = process.env.GUESTWAY_API_KEY
const ACCESS_TOKEN = process.env.GUESTWAY_ACCESS_TOKEN

export type DoorCheck = 'confirmed' | 'not-yet' | 'unreadable'

interface AccessRow {
  confirmationCode?: string
  accesses?: Array<{
    lock?: { name?: string; isRoomDoor?: boolean }
    code?: { validFrom?: string; validTo?: string; isDisabled?: boolean } | null
  }>
}

/** When the room door's code starts working, per Guestway. `null` when there
 *  is no readable answer: not configured, no room door, no code, or an error. */
export async function roomDoorValidFrom(confirmationCode: string): Promise<string | null> {
  if (!API_URL || !PARTNERSHIP_API_KEY || !ACCESS_TOKEN || !confirmationCode) return null
  const filters = [{ field: 'confirmationCode', operator: 'eq', value: confirmationCode }]
  const res = await fetch(`${API_URL}/reservation-accesses?filters=${encodeURIComponent(JSON.stringify(filters))}`, {
    headers: { 'X-Api-Key': PARTNERSHIP_API_KEY, Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`guestway reservation-accesses ${res.status}`)
  const data = (await res.json()) as { data?: AccessRow[] }
  // The filter is trusted only as far as the row confirms it — an unknown
  // filter field makes this endpoint answer with the whole list.
  const row = (data.data ?? []).find((r) => r.confirmationCode === confirmationCode)
  const door = row?.accesses?.find((a) => a.lock?.isRoomDoor === true)
  const code = door?.code
  if (!code || code.isDisabled || !code.validFrom) return null
  return code.validFrom
}

const DEFAULT_ATTEMPTS = 5
const DEFAULT_INTERVAL_MS = 4_000

/**
 * Poll Guestway until the room door's window starts at (or before) the
 * arrival we wrote, within a small budget. Twenty seconds covers the sync
 * as measured; it does not hold a serverless function open for long.
 */
export async function doorFollowsArrival(
  confirmationCode: string,
  arrivalIso: string,
  opts: { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<DoorCheck> {
  const attempts = opts.attempts ?? DEFAULT_ATTEMPTS
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const wanted = new Date(arrivalIso).getTime()
  if (!Number.isFinite(wanted)) return 'unreadable'

  let readable = false
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(intervalMs)
    try {
      const validFrom = await roomDoorValidFrom(confirmationCode)
      if (validFrom) {
        readable = true
        const from = new Date(validFrom).getTime()
        // A minute of tolerance: Guestway keeps seconds, our arrival is on the minute.
        if (Number.isFinite(from) && from <= wanted + 60_000) return 'confirmed'
      }
    } catch (err) {
      bookingLog.warn('room-ready: could not read the door from Guestway', {
        confirmationCode,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return readable ? 'not-yet' : 'unreadable'
}
