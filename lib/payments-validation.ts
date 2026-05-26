// Server-side validation of the prepayment amount the client is about to
// authorize in Adyen. Recomputes the total against fresh Apaleo offers and
// rejects mismatches before the Adyen call goes out — closes the gap where
// stale Zustand state, mid-session rate changes, or misconfigured rate plans
// would otherwise send a different amount than what Apaleo will bill on folio.
//
// Strict cent-equality: any diff > 0 cents fails. Apaleo errors are retried
// 3× with exponential backoff before returning `unavailable` — booking creation
// downstream would fail too if Apaleo were really down, so fail-fast is safer
// than charging and rolling back.

import { createClient } from '@supabase/supabase-js'
import dayjs from 'dayjs'

import { getSingleRoom } from '@/services/getSingleRoom'
import { getApaleoExtras } from '@/app/actions/apaleo/services/getExtras'
import { getExtraPrice } from '@/lib/utils'
import { priceLog, apaleoLog } from '@/lib/logger'
import type { Booking } from '@/types/booking'
import type { RoomOffer } from '@/types/offers'
import type { RoomExtra } from '@/types/types'

const MAX_APALEO_ATTEMPTS = 3

export type ValidationResult =
  | { status: 'valid'; expectedCents: number; clientCents: number }
  | {
      status: 'mismatch'
      expectedCents: number
      clientCents: number
      breakdown: ReservationBreakdown[]
    }
  | { status: 'unavailable'; reason: string }
  | {
      status: 'skipped'
      reason: 'no-reference' | 'no-pending' | 'cleared' | 'empty-reservations'
    }

interface ReservationBreakdown {
  ratePlanId: string
  adults: number
  arrival: string
  departure: string
  expectedRoomEur: number
  expectedExtrasEur: number
  expectedReservationCents: number
  clientReservationCents: number
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// CharlieM rate plan id format: <property>-<rateplan>-<unitgroup>
// e.g. CMH-FLEX_WEB3-SPK → CMH-SPK
function unitGroupFromRatePlan(ratePlanId: string): string {
  const parts = ratePlanId.split('-')
  if (parts.length < 2) return ratePlanId
  return `${parts[0]}-${parts[parts.length - 1]}`
}

// Mirror of calculateRoomPrice in formatReservations (lib/utils.ts).
// Kept inline to avoid coupling: any drift here would silently break validation.
function calculateRoomPrice(
  adults: number,
  maxPersons: number,
  price: number,
  priceForTwo: number,
): number {
  const roomsNeeded = Math.ceil(adults / maxPersons)
  if (adults === 1) return price
  if (adults % 2 === 0) return roomsNeeded * priceForTwo
  return Math.floor(adults / 2) * priceForTwo + price
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchOfferWithRetry(
  unitGroupId: string,
  from: string,
  to: string,
  adults: string,
): Promise<RoomOffer[] | null> {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_APALEO_ATTEMPTS; attempt++) {
    try {
      const result = await getSingleRoom(unitGroupId, from, to, adults, 'en')
      if ('error' in result) {
        lastError = result.error
        apaleoLog.warn('offer fetch returned error', {
          attempt,
          unitGroupId,
          error: result.error,
        })
      } else {
        return result
      }
    } catch (err) {
      lastError = err
      apaleoLog.warn('offer fetch threw', {
        attempt,
        unitGroupId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    if (attempt < MAX_APALEO_ATTEMPTS) {
      await sleep(attempt * 1000)
    }
  }
  apaleoLog.error('offer fetch exhausted retries', {
    unitGroupId,
    from,
    to,
    adults,
    lastError: lastError instanceof Error ? lastError.message : String(lastError),
  })
  return null
}

export async function validatePaymentAmount(
  reference: string | undefined,
  clientAmountCents: number,
): Promise<ValidationResult> {
  if (!reference) {
    return { status: 'skipped', reason: 'no-reference' }
  }

  const supabaseAdmin = createAdminClient()
  const { data: pendingRow, error: pendingError } = await supabaseAdmin
    .from('pending_bookings')
    .select('booking_payload')
    .eq('reference', reference)
    .maybeSingle()

  // Treating db errors and missing rows the same way is a deliberate tradeoff:
  // save-pending may have failed silently (PaymentForm catches and continues),
  // so a missing row doesn't always mean "not a booking flow". Skipping here
  // lets the payment go through during db hiccups instead of blocking real
  // bookings — the alternative (block on missing row) would be stricter but
  // would fail customer payments whenever supabase blips.
  if (pendingError) {
    priceLog.warn('validation: pending_bookings query failed — skipping', {
      reference,
      error: pendingError.message,
    })
    return { status: 'skipped', reason: 'no-pending' }
  }
  if (!pendingRow?.booking_payload) {
    return { status: 'skipped', reason: 'no-pending' }
  }

  const payload = pendingRow.booking_payload as Booking | { cleared: true }
  if ('cleared' in payload && payload.cleared) {
    return { status: 'skipped', reason: 'cleared' }
  }

  const booking = payload as Booking
  if (!booking.reservations || booking.reservations.length === 0) {
    return { status: 'skipped', reason: 'empty-reservations' }
  }

  // Fetch extras catalog only when reservations actually carry services.
  // Catalog date range spans min(arrivals) → max(departures) so split-stay
  // bookings (different dates per reservation) still see every service.
  const hasExtras = booking.reservations.some(r => r.services && r.services.length > 0)
  let extrasCatalog: Awaited<ReturnType<typeof getApaleoExtras>> = []
  if (hasExtras) {
    const arrivals = booking.reservations.map(r => r.arrival.slice(0, 10)).sort()
    const departures = booking.reservations.map(r => r.departure.slice(0, 10)).sort()
    const catalogFrom = arrivals[0]
    const catalogTo = departures[departures.length - 1]
    try {
      extrasCatalog = await getApaleoExtras(catalogFrom, catalogTo, 'en')
    } catch (err) {
      apaleoLog.warn('extras catalog fetch failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return { status: 'unavailable', reason: 'extras catalog fetch failed' }
    }
  }

  const breakdown: ReservationBreakdown[] = []
  let totalExpectedCents = 0

  for (const reservation of booking.reservations) {
    const ratePlanId = reservation.timeSlices?.[0]?.ratePlanId
    if (!ratePlanId) {
      priceLog.error('reservation missing ratePlanId', { reservation })
      return { status: 'unavailable', reason: 'reservation missing ratePlanId' }
    }

    const unitGroupId = unitGroupFromRatePlan(ratePlanId)
    // Date extraction via slice (not dayjs.format) avoids any timezone shift
    // when the server runs in UTC and the ISO string carries a +02:00 offset:
    // "2026-09-17T15:00:00+02:00" → "2026-09-17" deterministically.
    const from = reservation.arrival.slice(0, 10)
    const to = reservation.departure.slice(0, 10)
    const adults = reservation.adults

    const offers = await fetchOfferWithRetry(unitGroupId, from, to, String(adults))
    if (!offers) {
      return { status: 'unavailable', reason: 'apaleo offers fetch failed' }
    }

    const offer = offers.find(o => o.ratePlan?.id === ratePlanId)
    if (!offer) {
      apaleoLog.error('rate plan no longer in offers', {
        ratePlanId,
        availableIds: offers.map(o => o.ratePlan?.id),
      })
      return { status: 'unavailable', reason: `rate plan ${ratePlanId} not in offers` }
    }

    // CharlieM RoomOffer marks price/priceForTwo as optional. If Apaleo returned
    // an offer without prices, we can't compute the expected total — refuse
    // rather than default to 0 and risk charging a phantom amount.
    if (typeof offer.price !== 'number' || typeof offer.priceForTwo !== 'number') {
      apaleoLog.error('offer missing price fields', {
        ratePlanId,
        hasPrice: typeof offer.price === 'number',
        hasPriceForTwo: typeof offer.priceForTwo === 'number',
      })
      return { status: 'unavailable', reason: 'offer missing price fields' }
    }

    const maxPersons = offer.maxPersons || 2
    const roomPrice = calculateRoomPrice(adults, maxPersons, offer.price, offer.priceForTwo)

    // Mirror calculateNights in lib/utils.ts (no Math.max) — getSingleRoom
    // already guarantees departure > arrival so nights is always >= 1.
    const nights = dayjs(to).diff(dayjs(from), 'day')
    let extrasTotal = 0
    for (const service of reservation.services ?? []) {
      const catalogEntry = extrasCatalog.find(e => e.id === service.serviceId)
      if (!catalogEntry) {
        apaleoLog.error('service not in catalog', { serviceId: service.serviceId })
        return { status: 'unavailable', reason: `service ${service.serviceId} not in catalog` }
      }
      // Service payload may carry `dates` (selectedDates), see formatReservations.
      // UI enforces count=1 per date so we reconstruct selectedDates with count=1.
      const serviceWithDates = service as { serviceId: string; dates?: { serviceDate: string }[] }
      const asRoomExtra = {
        ...catalogEntry,
        selectedDates: serviceWithDates.dates?.map(d => ({
          serviceDate: d.serviceDate,
          count: 1,
        })),
      } as unknown as RoomExtra
      extrasTotal += getExtraPrice(asRoomExtra, adults, nights, from, to)
    }

    // Mirror formatReservations: round per reservation, then sum and round
    // total — order matters for cent-exact equality with the client.
    const reservationAmount = Math.round((roomPrice + extrasTotal) * 100) / 100
    const reservationCents = Math.round(reservationAmount * 100)
    totalExpectedCents += reservationCents

    breakdown.push({
      ratePlanId,
      adults,
      arrival: from,
      departure: to,
      expectedRoomEur: Math.round(roomPrice * 100) / 100,
      expectedExtrasEur: Math.round(extrasTotal * 100) / 100,
      expectedReservationCents: reservationCents,
      clientReservationCents: Math.round((reservation.prepaymentAmount?.amount ?? 0) * 100),
    })
  }

  const expectedCents = totalExpectedCents

  if (expectedCents !== clientAmountCents) {
    priceLog.error('💰 amount mismatch — rejecting payment', {
      reference,
      clientCents: clientAmountCents,
      expectedCents,
      diffCents: clientAmountCents - expectedCents,
      breakdown,
    })
    return {
      status: 'mismatch',
      clientCents: clientAmountCents,
      expectedCents,
      breakdown,
    }
  }

  priceLog.success('💰 amount valid', {
    reference,
    clientCents: clientAmountCents,
    expectedCents,
  })
  return {
    status: 'valid',
    clientCents: clientAmountCents,
    expectedCents,
  }
}
