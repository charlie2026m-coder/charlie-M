import { Fetch } from '@/services/Request';
import { apaleoLog } from '@/lib/logger';

/**
 * Is this reservation still one we may take money for?
 *
 * Every money path in this codebase used to answer that question only about its
 * OWN row — `pending`, `processing`, `completed` in Supabase — and never about
 * the reservation itself. So a guest who cancelled between paying and the
 * capture landing was still charged, and the reconcile cron could finish a
 * stuck purchase hours later against a booking that no longer existed.
 *
 * That is a narrow window in the normal flow and a wide one whenever anything
 * stalls, which is exactly when reconciliation runs.
 *
 * A cancelled stay is the clear case, and a no-show is the same thing for this
 * purpose: whatever is owed there is a fee posted by the hotel, never an extra
 * or a date change bought afterwards.
 */

const REFUSED = new Set(['Canceled', 'NoShow']);

export type ChargeVerdict = 'chargeable' | 'Canceled' | 'NoShow' | 'unknown';

/**
 * Deliberately fails OPEN on `unknown`.
 *
 * The instruction this implements is "if it is cancelled, do not try to take
 * the money" — an unreadable status is not a cancellation. Failing closed would
 * trade a real, observed problem for an invented one: an Apaleo blip would
 * start reversing perfectly good purchases and leaving guests without the
 * extras they bought. Callers get the verdict, so a stricter one can refuse on
 * `unknown` without changing this.
 */
export async function reservationChargeable(reservationId: string): Promise<ChargeVerdict> {
  if (!reservationId) return 'unknown';
  try {
    const res = await Fetch<{ status?: string }>(
      `/booking/v1/reservations/${encodeURIComponent(reservationId)}`,
    );
    const status = String(res?.status ?? '');
    if (!status) return 'unknown';
    return REFUSED.has(status) ? (status as 'Canceled' | 'NoShow') : 'chargeable';
  } catch (err) {
    apaleoLog.warn('charge guard: could not read reservation status — allowing', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'unknown';
  }
}

/** True only when Apaleo positively says the stay is gone. */
export function isRefusedVerdict(verdict: ChargeVerdict): verdict is 'Canceled' | 'NoShow' {
  return verdict === 'Canceled' || verdict === 'NoShow';
}
