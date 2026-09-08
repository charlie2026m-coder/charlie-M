/**
 * Which room-ready outcomes are worth waking someone for.
 *
 * This list got much shorter once the sweep existed
 * (app/api/cron/room-ready-sweep). Before it, the Guestway webhook was the only
 * chance a guest ever got: it fires once, never retries, so ANY refusal cost
 * them the whole day and every refusal deserved an alert.
 *
 * Now every reservation arriving today is re-tried all day long. So a room that
 * is merely not ready YET is not an incident — it is the normal state of a
 * hotel between checkout and housekeeping. Measured at Motz19, every unit read
 * Dirty right through the cleaning shift; alerting on that would have meant a
 * burst of pages every single morning describing nothing at all, and the real
 * ones would have stopped being read within the week.
 *
 * What is left are the states no amount of retrying can clear: a missing
 * property id, a reservation with no arrival time, and a price that would move.
 * Those read exactly the same at 09:00 and at 15:00.
 */
const DOOR_BLOCKING_REASONS = new Set([
  // Ours to fix: APALEO_PROPERTY_ID missing, so nothing can ever be moved.
  'not-configured',
  // The reservation has no arrival time — malformed, and no target to compute.
  'no-arrival-time',
  // The amend would re-price the stay, so we refuse to touch a paid folio. Not
  // a race: the rate has drifted since the booking and will keep having drifted.
  'price-drift',
]);

/**
 * True when this outcome needs a person, rather than another quarter of an hour.
 *
 * Everything not listed resolves itself or is simply not ours to act on:
 *
 *   · `unit-dirty`     housekeeping has not reached the room yet;
 *   · `unit-occupied`  Apaleo still has the previous guest in it — they clear
 *                      at the QR checkout or at the night audit;
 *   · `unit-unknown`   the inventory read failed; the next pass re-reads it;
 *   · `unit-changed`   the room was re-assigned, or stopped being ready,
 *                      between the check and the amend. The next pass looks at
 *                      whatever room the guest now has;
 *   · `no-unit-assigned` / `no-offer`  both usually resolve once Apaleo settles
 *                      the room assignment for the day;
 *   · `opposite-extension-conflict`  the departing guest bought a late
 *                      checkout. Nothing is broken — we sold them that;
 *   · `nothing-earlier-to-gain`  the everyday case, and the loudest if it ever
 *                      became alertable: it fires for most arrivals daily;
 *   · `not-arriving-today`, `too-late-in-day`, `status-*`,
 *     `not-found-or-other-property`  not ours to act on.
 */
export function doorStayedShut(reason: string): boolean {
  return DOOR_BLOCKING_REASONS.has(reason);
}
