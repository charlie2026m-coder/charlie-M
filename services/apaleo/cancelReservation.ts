import { getOrRefreshToken } from '@/services/Request'
import { bookingLog } from '@/lib/logger'

const APALEO_API_URL = 'https://api.apaleo.com'

/**
 * Cancel an Apaleo reservation. Best-effort: returns an outcome but never
 * throws — used in cleanup paths after a partial booking failure (booking was
 * created but authorization/folio capture didn't complete).
 *
 * Apaleo bookings are containers; cancelling the whole booking means
 * cancelling every reservation inside it. There is no booking-level cancel
 * endpoint — caller iterates over reservationIds.
 *
 * If a reservation cancel fails (e.g. already checked-in), the booking
 * remains in Apaleo and hotel staff will see an unpaid folio in the
 * dashboard — they can resolve it manually. The Adyen refund still runs
 * afterward to return the guest's money.
 */
export async function cancelReservation(
  reservationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getOrRefreshToken()

    bookingLog.info('PUT /reservation-actions/{id}/cancel', { reservationId })

    const response = await fetch(
      `${APALEO_API_URL}/booking/v1/reservation-actions/${reservationId}/cancel`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      },
    )

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      bookingLog.error('cancel reservation failed', {
        reservationId,
        status: response.status,
        error: errorBody,
      })
      return {
        success: false,
        error: `Apaleo ${response.status}: ${JSON.stringify(errorBody)}`,
      }
    }

    bookingLog.success('reservation cancelled', { reservationId })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    bookingLog.error('cancel reservation threw', { reservationId, error: message })
    return { success: false, error: message }
  }
}
