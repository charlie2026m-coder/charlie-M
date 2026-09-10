import { openRoomEarly, type RoomReadyOutcome } from '@/services/apaleo/amendStayTime';
import { bookingLog } from '@/lib/logger';
import { doorStayedShut } from '@/lib/roomReadyOutcome';
import { buildRoomReadyMessage, sendGuestwayMessage } from '@/services/guestway/sendGuestwayMessage';

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
    bookingLog.error('room-ready: amend failed', { reservationId, result });
    return result;
  }

  if (opts.alertOnFailure && result.status === 'skipped' && doorStayedShut(result.reason)) {
    // Only the reasons no retry can clear (see lib/roomReadyOutcome). The reason
    // goes in the MESSAGE, not just the payload, so Sentry groups one issue per
    // reason and Slack throttles per reason instead of collapsing a burst into
    // a single line.
    bookingLog.error(`room-ready: door not opened — ${result.reason}`, { reservationId });
    return result;
  }

  bookingLog.info('room-ready: result', { reservationId, result });
  return result;
}
