import { loadReservationForAmend, openRoomEarly, type RoomReadyOutcome } from '@/services/apaleo/amendStayTime';
import { bookingLog } from '@/lib/logger';
import { plainReason, webhookShouldAlert, whatToDo } from '@/lib/roomReadyOutcome';
import { buildRoomReadyMessage, sendGuestwayMessage } from '@/services/guestway/sendGuestwayMessage';
import { doorFollowsArrival } from '@/services/guestway/doorAccess';

/**
 * Open one guest's door early and tell them — the whole room-ready act, in the
 * one place both callers share.
 *
 * There are two callers and they must not drift apart: the Guestway webhook
 * (fast path, fires the moment housekeeping marks the room clean) and the sweep
 * (app/api/cron/room-ready-sweep, which re-tries every arrival all day and is
 * what makes the feature survive a webhook that never comes). Before this
 * existed the announce step lived inside the webhook route, so a door opened by
 * anything else would have swung open without a word to the guest.
 *
 * Idempotent through openRoomEarly: once the arrival has been moved, every
 * later call returns `nothing-earlier-to-gain` and no second message goes out.
 */
/** The room as a person knows it ("18"), for the alerts; '?' when unreadable —
 *  an alert with no room still beats no alert. */
async function roomNameOf(reservationId: string): Promise<string> {
  try {
    const ctx = await loadReservationForAmend(reservationId);
    return ctx?.unitName ?? ctx?.unitId ?? '?';
  } catch {
    return '?';
  }
}

export async function runRoomReady(
  reservationId: string,
  opts: { alertOnFailure?: boolean; trustGuestwayClean?: boolean } = {},
): Promise<RoomReadyOutcome> {
  // `trustGuestwayClean` belongs to the webhook alone: it means "Guestway just
  // told us this room is finished". The sweep has nothing equivalent to pass —
  // there is no housekeeping endpoint to ask — so it reads Apaleo instead.
  const result = await openRoomEarly(reservationId, {
    trustGuestwayClean: opts.trustGuestwayClean,
  });

  if (result.status === 'moved') {
    bookingLog.info('room-ready: result', { reservationId, result });
    // Door first, then the word — and the door has to be SEEN to move, not
    // assumed from the amend. Apaleo accepting the new arrival is a request;
    // the code on the room door is Guestway's, and it follows with a delay of
    // its own. On 2026-09-14 a guest was told "come in" while the door was
    // shut and stood outside at 10:25. So this asks Guestway whether the room
    // door's window now starts at the new arrival, and speaks only when it
    // does. Not confirmed in time means no message and an alert: the door is
    // open (or about to be), the guest still has the access details from
    // pre-check-in, and a person can follow up. Never a word before a door.
    const door = await doorFollowsArrival(reservationId, result.to);
    if (door !== 'confirmed') {
      const room = await roomNameOf(reservationId);
      bookingLog.error(`Room ${room}: arrival moved in Apaleo but the door has not followed — guest NOT told (${door})`, {
        reservationId,
        arrival: result.to,
        'what to do': 'check the reservation in Guestway; Extend access opens the door by hand',
      });
      return result;
    }
    // Told from here, not by a second Guestway automation, so the words and the
    // door cannot disagree: the guest hears about it when it is true, and never
    // on a schedule of its own.
    //
    // Channel chat (Booking.com, Airbnb), falling back to email for direct
    // guests with no thread. WhatsApp is deliberately absent — outside the
    // 24-hour window it only accepts an approved template, which a free-text
    // Open API call is not, and its SMS fallback has never once reached 'sent'.
    const chat = await sendGuestwayMessage({
      reservationId,
      medium: 'channel_chat',
      body: buildRoomReadyMessage(result.to),
    });
    if (!chat.success) {
      // The door IS open; only the invitation went missing. Always alertable,
      // whoever opened it — the guest is standing outside a room they could
      // have walked into, and this happens at most once per stay, so it can
      // never become noise.
      bookingLog.error('room-ready: door opened but guest was not told', {
        reservationId,
        error: chat.error,
      });
    }
    return result;
  }

  if (result.status === 'error') {
    const room = await roomNameOf(reservationId);
    bookingLog.error(`Room ${room}: door could not be opened — Apaleo error`, {
      reservationId,
      error: result.reason,
      'what to do': 'open by hand in Guestway (Extend access); the sweep retries every 15 min',
    });
    return result;
  }

  if (opts.alertOnFailure && result.status === 'skipped' && webhookShouldAlert(result.reason)) {
    // Guestway has just said the room is finished; every refusal but the benign
    // ones is a door that should have opened and did not (lib/roomReadyOutcome).
    // Said with the room and in words, because the reader is whoever can fix
    // it, and with what to do, because the fix differs per reason. The reason
    // stays in the message so Sentry groups one issue per reason and Slack
    // throttles per room and reason rather than collapsing a burst.
    const room = await roomNameOf(reservationId);
    bookingLog.error(`Room ${room}: cleaned, but the door was NOT moved — ${plainReason(result.reason)}`, {
      reservationId,
      reason: result.reason,
      'what to do': whatToDo(result.reason),
    });
    return result;
  }

  bookingLog.info('room-ready: result', { reservationId, result });
  return result;
}
