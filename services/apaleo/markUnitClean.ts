import { Fetch } from '@/services/Request';
import { apaleoLog } from '@/lib/logger';
import { notifySlack } from '@/lib/slack';

/**
 * Tell Apaleo a room has been cleaned, when Guestway already knows.
 *
 * Why this exists
 * ---------------
 * The cleaners work in Guestway and nowhere else — they close the task there,
 * and that is the only place a human ever marks a room finished. Apaleo's own
 * `condition` is therefore not a second opinion about the room; it is an echo of
 * the same fact, and it arrives late. Measured on prod: Guestway closed the task
 * for MXMGMNHX-1 at 09:28 on 2026-09-10 and Apaleo read `Clean` only between
 * 10:55 and 11:10 — an hour and a half behind. 2026-09-07 showed the same shape
 * an hour wide.
 *
 * That delay is not harmless, because half the system reads Apaleo: the sweep,
 * the early-departure block that decides whether a room may be sold, and
 * HotelCheck's cleaning list. For an hour and a half all of them believe a
 * finished room is dirty. The guest who was told at 09:30 to come in and could
 * only get in at 11:13 is the visible half of it.
 *
 * So when Guestway tells us a room is ready, we pass that on to Apaleo instead
 * of waiting for it to hear the same thing by itself.
 *
 * What this is NOT
 * ----------------
 * It is not us deciding a room is clean. The only input is Guestway's own
 * assertion, made by the person who did the work. We are the messenger, not the
 * witness — which is exactly why nothing is lost by doing it: there was never a
 * second witness to overrule, only a slow copy of the first.
 *
 * Only ever `Clean`, and never for an occupied room — callers check that before
 * getting here. Marking a room dirty is somebody else's job; taking cleanliness
 * away on a guess is not a thing this should be able to do.
 *
 * Best-effort by contract: never throws. If it fails, everything behaves exactly
 * as it did before — Apaleo catches up on its own an hour or so later. It still
 * says so in Slack, because "back to the old behaviour" is invisible from the
 * outside and this path had no way of telling anyone it had stopped working.
 */
export async function markUnitClean(unitId: string): Promise<boolean> {
  if (!unitId) return false;
  try {
    // Batch endpoint, one unit at a time. The enum is Clean | CleanToBeInspected
    // | Dirty — note the spelling, `CleanToInspect` is not a value Apaleo knows
    // and code that tested for it was matching nothing.
    await Fetch('/operations/v1/units-condition', {
      method: 'PUT',
      body: { unitsConditions: [{ id: unitId, condition: 'Clean' }] },
    });
    apaleoLog.info('room-ready: told Apaleo the room is clean', { unitId });
    return true;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    apaleoLog.warn('room-ready: could not pass the clean signal to Apaleo', {
      unitId,
      error: reason,
    });
    // The room id lives in the FIELDS, not the message text, on purpose. The
    // likely failure here is systemic — a revoked scope, a moved endpoint — and
    // would hit every room of the day. Slack throttles per message text, so a
    // constant one collapses that into a single line every ten minutes instead
    // of one per room. The detail is still in the payload for whoever looks.
    // Wrapped even though notifySlack promises never to throw. "Never throws" is
    // this function's own contract, and the caller in openRoomEarly does not
    // guard it — so leaning on another module's promise would mean a Slack
    // outage taking the door with it. A failed alert must never cost a guest
    // their room.
    try {
      await notifySlack('warn', 'Room-ready: Apaleo did not accept the clean signal', {
        room: unitId,
        apaleo: reason.slice(0, 200),
        effect:
          'that room stays Dirty in Apaleo until Guestway syncs it (~1.5 h) — the sale block, the sweep and the cleaning list are behind until then',
        'to do': 'check the operations.change-room-state scope and PUT /operations/v1/units-condition',
      });
    } catch {
      // Nothing left to tell anyone with.
    }
    return false;
  }
}
