/**
 * Is this the same person?
 *
 * Apaleo shows a continuous stay booked as two reservations as a checkout and
 * a check-in on the seam day, and marks the room Dirty because every checkout
 * is. From the outside that is a turnover: dirty room, an arrival today, a
 * guest "not yet in". Measured on prod 2026-09-10, room 310 — one address on
 * both reservations, the guest upstairs since the day before, and the urgent
 * alert calling him locked out.
 *
 * Every place that reasons about "a departure and an arrival in the same room
 * today" has to ask this first. The sweep, before it pages. The guard that
 * refuses to sell a late checkout and an early check-in on one room — a guest
 * bridging their own two reservations with exactly those two products is not a
 * collision; there is nobody to clean up after.
 *
 * Email decides when both sides have one. Surname is the fallback, because a
 * channel booking can arrive without an address. Anything less is `null`: not
 * "different", merely unknown — and the safe direction differs by caller (the
 * sweep pages, the guard blocks), so the caller picks it.
 */
export interface GuestIdentity {
  email?: string | null
  lastName?: string | null
}

const email = (g?: GuestIdentity) => g?.email?.trim().toLowerCase() || ''
// "Michael  Sommer" with a doubled space was live data.
const surname = (g?: GuestIdentity) => g?.lastName?.trim().toLowerCase().replace(/\s+/g, ' ') || ''

export function sameGuest(a?: GuestIdentity, b?: GuestIdentity): boolean | null {
  const ea = email(a)
  const eb = email(b)
  if (ea && eb) return ea === eb
  const sa = surname(a)
  const sb = surname(b)
  if (sa && sb) return sa === sb
  return null
}
