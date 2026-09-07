/**
 * The breakfast night/morning mapping — one implementation, shared.
 *
 * Apaleo dates a daily service by the NIGHT. A guest arriving on the 10th for
 * three nights carries serviceDates 10, 11 and 12, and leaves on the 13th.
 * Nobody eats breakfast on the evening they arrive: they eat it the morning
 * after. So a night maps to the morning AFTER it, and the last breakfast of a
 * stay falls on departure day.
 *
 * This lives in lib/ rather than services/breakfast.ts because the booking
 * modal needs it in the browser and the modal must not pull in supabase-js and
 * the Apaleo client. Two copies of an off-by-one-day rule would drift, and the
 * failure mode is silent: every guest offered the wrong menu on the wrong day
 * while every screen looks correct.
 */

/** YYYY-MM-DD + n days. UTC arithmetic on purpose: a local-time implementation
 *  returns the same date twice across Berlin's spring-forward night. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The morning served for a booked night. */
export const nightToMorning = (night: string): string => addDays(night, 1)

/** The night that must be booked in Apaleo for a given morning. */
export const morningToNight = (morning: string): string => addDays(morning, -1)

/**
 * Every morning a stay can have breakfast on: the morning after each night,
 * i.e. the day after arrival through departure day inclusive.
 *
 * `from` and `to` are the stay's arrival and departure dates (YYYY-MM-DD), the
 * same pair the booking flow already carries.
 */
export function breakfastMorningsForStay(from: string, to: string): string[] {
  const out: string[] = []
  if (!from || !to) return out
  // Guard against a reversed or absurd range rather than looping forever.
  for (let d = addDays(from, 1), i = 0; d <= to && i < 366; d = addDays(d, 1), i++) {
    out.push(d)
  }
  return out
}
