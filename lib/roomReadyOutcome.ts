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
 * hotel between checkout and housekeeping, and on 2026-09-08 all thirteen units
 * read Dirty at 09:39, 10:00, 10:56 and 11:19. Alerting on that would have
 * meant a burst of pages every single morning describing nothing at all, and
 * the real ones would have stopped being read within the week.
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
 *   · `unit-reassigned`     Apaleo moved the guest to another room between the
 *                          check and the amend — a front-desk question, and the
 *                          next pass looks at whatever room they now have;
 *   · `unit-no-longer-ready` the room we checked stopped being ready in that
 *                          same gap — a housekeeping question. Deliberately not
 *                          the same string as the line above: they are two
 *                          different problems for two different people;
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

/** Plain words for every reason a door can refuse. Read by whoever can act on
 *  it — the alert, the daily report — not by whoever wrote the code. */
export const PLAIN_REASON: Record<string, string> = {
  'unit-dirty': 'not cleaned yet',
  'unit-occupied': 'previous guest still checked in',
  'unit-unknown': 'room status unreadable',
  'unit-reassigned': 'guest moved to another room',
  'unit-no-longer-ready': 'room stopped being ready',
  'no-unit-assigned': 'no room assigned yet',
  'no-offer': 'Apaleo offered nothing for the earlier time',
  'price-drift': 'price would change — refused',
  'opposite-extension-conflict': 'departing guest bought a late checkout',
  'nothing-earlier-to-gain': 'nothing earlier to gain',
  'no-arrival-time': 'reservation has no arrival time',
  'not-configured': 'APALEO_PROPERTY_ID is not set',
  'not-found-or-other-property': 'reservation not found in this hotel',
  'not-arriving-today': 'not arriving today',
  'too-late-in-day': 'too late in the day',
  opened: 'opened',
};

export function plainReason(reason: string): string {
  if (reason.startsWith('status-')) return `guest is ${reason.slice('status-'.length)}`;
  return PLAIN_REASON[reason] ?? reason;
}

/** The second line of an alert: what a person can do about it. The fix
 *  differs per reason, and "open by hand in Guestway" is a real one — the
 *  Extend access button works when nothing else does. */
const WHAT_TO_DO: Record<string, string> = {
  'unit-occupied': 'check the previous guest out in Apaleo — the door cannot open while they are in the room',
  'unit-unknown': 'Apaleo could not be read; the sweep retries every 15 min',
  'unit-reassigned': 'the guest now has a different room; the sweep looks at it next pass',
  'unit-no-longer-ready': 'the room stopped being ready between the check and the amend — ask housekeeping',
  'no-unit-assigned': 'assign a room in Apaleo, or open by hand in Guestway (Extend access)',
  'no-offer': 'Apaleo offers nothing for this reservation — open by hand in Guestway (Extend access)',
  'price-drift': 'Apaleo would re-price the stay — open by hand in Guestway (Extend access)',
  'opposite-extension-conflict': 'the departing guest has a late checkout on this room; the door cannot open before 13:00',
  'no-arrival-time': 'the reservation has no arrival time — fix it in Apaleo',
  'not-configured': 'set APALEO_PROPERTY_ID in Vercel',
  'unit-dirty': 'Guestway said clean but Apaleo reads dirty — check the room',
};

export function whatToDo(reason: string): string | undefined {
  return WHAT_TO_DO[reason];
}

/** Outcomes that mean "nothing to do" even right after Guestway said the room
 *  is finished: the door is already open, the guest is already in (or out, or
 *  cancelled), or the day is over. */
const BENIGN_WHEN_CLEAN = new Set([
  'nothing-earlier-to-gain',
  'not-arriving-today',
  'too-late-in-day',
  'not-found-or-other-property',
]);

/**
 * On the WEBHOOK path Guestway has just said the room is finished. Every
 * refusal but the benign ones is then a door that should have opened and did
 * not — the previous guest still checked in, no offer, a re-priced stay, no
 * room assigned, the room read dirty after all. Each of those needs a person,
 * and the person needs to hear it now, not at the 14:10 report. The owner's
 * word on 2026-09-14: "if it doesn't work or errors — an alert in Slack".
 */
export function webhookShouldAlert(reason: string): boolean {
  if (reason.startsWith('status-')) return false;
  return !BENIGN_WHEN_CLEAN.has(reason);
}

/**
 * On the SWEEP, which runs 44 times a day, the reasons no retry can clear are
 * said once an hour (the :10 pass) with the room and in words. Every pass
 * would be a storm; never would hide a door that will not open all day.
 * `unit-*` states are not here: they are the normal morning, and the urgent
 * alert speaks for them thirty minutes before the guest is due.
 */
const SWEEP_HOURLY = new Set(['not-configured', 'no-arrival-time', 'price-drift', 'no-offer']);

export function sweepShouldNudge(reason: string): boolean {
  return SWEEP_HOURLY.has(reason);
}
