import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { HOTEL_INFO } from '@/lib/Constants'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Berlin UTC offset in ms for a given instant (e.g. UTC+2 -> +7200000). */
function getBerlinOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0')
  const berlinMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return berlinMs - date.getTime()
}

/**
 * Apaleo rejects bookings whose arrival check-in datetime is already in the
 * past. If a reservation's arrival (its date at the hotel check-in hour, Berlin
 * time) is before now, shift the arrival to now + 5 minutes. Returns a NEW
 * array; reservations that are fine are returned unchanged.
 *
 * Shared by both booking paths — the client `/api/bookings/create` AND the
 * Adyen webhook's createBookingFromPending (the path taken when the guest
 * closes the tab after paying) — so a same-day booking made after the check-in
 * hour isn't silently rejected-and-refunded on one of them.
 */
export function correctPastArrivals<T extends { arrival: string }>(reservations: T[]): T[] {
  const now = new Date()
  const hotelCheckinHour = parseInt(HOTEL_INFO.checkinTime.split(':')[0])
  const berlinOffsetMs = getBerlinOffsetMs(now)

  return reservations.map((reservation) => {
    const arrivalDateStr = reservation.arrival.slice(0, 10)
    const arrivalCheckinUTC =
      new Date(`${arrivalDateStr}T${String(hotelCheckinHour).padStart(2, '0')}:00:00Z`).getTime() - berlinOffsetMs

    if (new Date(arrivalCheckinUTC) < now) {
      return { ...reservation, arrival: dayjs(now).add(5, 'minute').tz('Europe/Berlin').format() }
    }
    return reservation
  })
}
