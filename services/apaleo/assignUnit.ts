import { Fetch } from '@/services/Request'
import { logger } from '@/lib/logger'

const log = logger.withTag('assign-unit')

/**
 * Pin a reservation to a specific unit.
 *
 * The stay-extension flow only offers an extension when the guest's OWN studio
 * is free, so the new reservation has to land on that studio. Apaleo otherwise
 * assigns any free unit in the category, which would move the guest — the very
 * thing the extension is sold on avoiding.
 *
 * Best-effort by design: the booking and the payment have already succeeded by
 * the time this runs, so a failure here must never surface as a booking error.
 * The guest keeps a valid reservation; only the room number may differ, and
 * the hotel sees it in the log.
 */
export async function assignUnit(reservationId: string, unitId: string): Promise<boolean> {
  if (!reservationId || !unitId) return false
  try {
    await Fetch(`/booking/v1/reservation-actions/${encodeURIComponent(reservationId)}/assign-unit`, {
      method: 'PUT',
      body: { unitId },
    })
    log.success('unit pinned to reservation', { reservationId, unitId })
    return true
  } catch (err) {
    log.warn('could not pin unit — Apaleo keeps its own assignment', {
      reservationId,
      unitId,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
