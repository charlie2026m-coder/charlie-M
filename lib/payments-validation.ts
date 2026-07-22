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
import { Fetch } from '@/services/Request'
import { getExtraPrice } from '@/lib/utils'
import {
  computeServicesTotalCents,
  buildApaleoServicePayloads,
  isCleaningService,
  isStayExtensionService,
  UnknownServiceError,
  type ExtrasPriceLine,
  type ApaleoBookServicePayload,
} from '@/lib/extrasPrice'
import { priceLog, apaleoLog } from '@/lib/logger'
import { pendingServicesReadSchema } from '@/types/schemas'
import type { Booking } from '@/types/booking'
import type { RoomOffer } from '@/types/offers'
import type { RoomExtra } from '@/types/types'
import type { ApaleoReservationResponse } from '@/types/apaleo'

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

// Berlin-local date / clock (the hotel's frame; the server runs in UTC). Used
// for the same-day ECI sale deadline — dayjs() would give UTC and be 1-2h off.
function berlinToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function berlinNowHHmm(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const hh = parts.find(p => p.type === 'hour')?.value ?? '00'
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${hh}:${mm}`
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
  // Every non-valid outcome is fail-closed (503). PaymentForm now blocks
  // the Adyen submit when save-pending fails, so by the time make-payment
  // fires, the pending_bookings row MUST exist. Any of the conditions
  // below indicate either a tampered request, account-deletion mid-flow,
  // or a supabase outage — none safe to charge through.
  if (!reference) {
    priceLog.error('validation: no reference in request', {})
    return { status: 'unavailable', reason: 'no-reference' }
  }

  const supabaseAdmin = createAdminClient()
  const { data: pendingRow, error: pendingError } = await supabaseAdmin
    .from('pending_bookings')
    .select('booking_payload')
    .eq('reference', reference)
    .maybeSingle()

  if (pendingError) {
    priceLog.error('validation: pending_bookings query failed', {
      reference,
      error: pendingError.message,
    })
    return { status: 'unavailable', reason: 'pending_bookings query failed' }
  }
  if (!pendingRow?.booking_payload) {
    priceLog.error('validation: no pending_bookings row for reference', { reference })
    return { status: 'unavailable', reason: 'no-pending' }
  }

  const payload = pendingRow.booking_payload as Booking | { cleared: true }
  if ('cleared' in payload && payload.cleared) {
    priceLog.error('validation: pending_bookings payload was cleared (GDPR delete)', { reference })
    return { status: 'unavailable', reason: 'cleared' }
  }

  const booking = payload as Booking
  if (!booking.reservations || booking.reservations.length === 0) {
    priceLog.error('validation: pending payload has no reservations', { reference })
    return { status: 'unavailable', reason: 'empty-reservations' }
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
      // Per-person services (e.g. breakfast, usageType.Person) are priced for
      // EVERY guest in the room — adults AND children — exactly as the client
      // does (BookingMenu: room.adults + room.children). Using adults only here
      // rejected legitimate family + breakfast bookings as an amount mismatch.
      const serviceGuests = adults + ((reservation as { children?: number }).children ?? 0)
      extrasTotal += getExtraPrice(asRoomExtra, serviceGuests, nights, from, to)
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


export type ServicesValidationResult =
  | {
      status: 'valid'
      expectedCents: number
      clientCents: number
      // Apaleo book-service payloads built from the SAME services + catalog the
      // amount was validated against — daily services already expanded to
      // per-night dates so the folio matches the charge.
      apaleoServices: ApaleoBookServicePayload[]
    }
  | {
      status: 'mismatch'
      expectedCents: number
      clientCents: number
      breakdown: ExtrasPriceLine[]
    }
  | { status: 'unavailable'; reason: string }

interface ReservationValidationData {
  arrival: string
  departure: string
  // Extras window for an in-house guest: services apply from TODAY (Berlin),
  // not from the original arrival — mirrors the cabinet client
  // (profile/reservations/[id]/page.tsx extrasStartDate/nights). The true
  // arrival stays above for the ECI/LCO guards.
  extrasStart: string
  extrasNights: number
  // True when no stay night remains from today (departure-day / post-stay):
  // night-based services must be refused — extrasNights is floored to 1 for
  // the LCO math, so nightDates would otherwise book the departure date, a
  // date OUTSIDE the stay, and Apaleo rejects it AFTER the charge.
  extrasWindowEnded: boolean
  arrivalTime: string   // "HH:mm" local — to detect an already-applied ECI (13:00)
  departureTime: string // "HH:mm" local — to detect an already-applied LCO (13:00)
  nights: number
  existingCleaningDates: Set<string>
}

type ReservationFetchOutcome =
  | { kind: 'ok'; data: ReservationValidationData }
  | { kind: 'not-found'; reason: string }
  | { kind: 'retryable'; reason: string }

// `Fetch` throws Error with message "Apaleo API error: <status> - <body>".
// Parse the status to decide whether to retry: 5xx, network errors, 408
// (request timeout) and 429 (rate limit) are transient (retry); other 4xx
// (other than 401 — already handled inside Fetch via token refresh) is
// permanent (don't retry, return not-found so the caller fails fast instead
// of wasting 6 s on backoff).
const TRANSIENT_4XX = new Set([408, 429])

function classifyFetchError(err: unknown): 'retryable' | 'not-found' {
  const msg = err instanceof Error ? err.message : String(err)
  const match = /Apaleo API error:\s*(\d{3})/.exec(msg)
  if (!match) return 'retryable'
  const status = Number(match[1])
  if (TRANSIENT_4XX.has(status)) return 'retryable'
  if (status >= 400 && status < 500) return 'not-found'
  return 'retryable'
}

async function fetchReservationForValidation(
  reservationId: string,
): Promise<ReservationFetchOutcome> {
  const propertyId = process.env.APALEO_PROPERTY_ID
  let res: ApaleoReservationResponse
  try {
    res = await Fetch<ApaleoReservationResponse>(
      `/booking/v1/reservations/${reservationId}?propertyIds=${propertyId}&expand=services`,
    )
  } catch (err) {
    const kind = classifyFetchError(err)
    apaleoLog.warn('reservation fetch threw', {
      reservationId,
      kind,
      error: err instanceof Error ? err.message : String(err),
    })
    return { kind, reason: err instanceof Error ? err.message : String(err) }
  }

  if (!res) {
    apaleoLog.warn('reservation fetch returned empty body', { reservationId })
    return { kind: 'retryable', reason: 'empty body' }
  }
  if (res.property?.id !== propertyId) {
    // Either Apaleo schema drift (missing property field) or a cross-hotel
    // reservation surfaced. Both are permanent for this caller.
    apaleoLog.error('reservation property mismatch or missing — refusing', {
      reservationId,
      gotPropertyId: res.property?.id,
      expectedPropertyId: propertyId,
    })
    return { kind: 'not-found', reason: 'property mismatch' }
  }

  const arrival = res.arrival.slice(0, 10)
  const departure = res.departure.slice(0, 10)
  const arrivalTime = res.arrival.match(/T(\d{2}:\d{2})/)?.[1] ?? ''
  const departureTime = res.departure.match(/T(\d{2}:\d{2})/)?.[1] ?? ''
  const nights = dayjs(departure).diff(dayjs(arrival), 'day')
  if (nights < 1) {
    priceLog.error('reservation has non-positive nights — refusing', {
      reservationId,
      arrival: res.arrival,
      departure: res.departure,
    })
    return { kind: 'not-found', reason: 'non-positive nights' }
  }

  // In-house guests buy extras for the REMAINING nights only — the client
  // prices with nights from max(today, arrival) (page.tsx), so the validator
  // must use the same window or every mid-stay daily-service purchase is
  // rejected as a mismatch after the guest already entered their card.
  // YYYY-MM-DD strings compare lexically; departure-day purchases count as 1.
  const today = berlinToday()
  const extrasStart = today > arrival ? today : arrival
  const extrasNightsDiff = dayjs(departure).diff(dayjs(extrasStart), 'day')
  const extrasNights = extrasNightsDiff <= 0 ? 1 : extrasNightsDiff
  const extrasWindowEnded = extrasNightsDiff <= 0

  const existingCleaningDates = new Set<string>()
  for (const paid of res.services ?? []) {
    if (!isCleaningService(paid.service.id, paid.service.name)) continue
    for (const d of paid.dates ?? []) {
      existingCleaningDates.add(d.serviceDate.slice(0, 10))
    }
  }

  return {
    kind: 'ok',
    data: { arrival, departure, extrasStart, extrasNights, extrasWindowEnded, arrivalTime, departureTime, nights, existingCleaningDates },
  }
}

// Lookup uses `reference` (canonical pending_services schema). Payload is read
// from the `services` JSONB. The validator never trusts the column shape:
// `pendingServicesReadSchema.safeParse` runs first so any malformed row fails
// closed before reaching the price computation.
export async function validateServicesPayment(
  reference: string | undefined,
  clientAmountCents: number,
  // 'auth' = pre-authorization (make-payment): all guards apply.
  // 'webhook' = post-authorization re-validation: time-of-day deadlines are
  // SKIPPED — a purchase that was legal at auth (12:55) must not be refunded
  // because the webhook landed minutes later (13:03). State-based guards
  // (already-applied, amounts) still apply in both phases.
  opts: { phase?: 'auth' | 'webhook' } = {},
): Promise<ServicesValidationResult> {
  const phase = opts.phase ?? 'auth'
  if (!reference) {
    return { status: 'unavailable', reason: 'no-reference' }
  }

  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('pending_services')
    .select('reservation_id, services')
    .eq('reference', reference)
    .maybeSingle()

  if (error) {
    priceLog.error('services validation: pending_services query failed', {
      reference,
      error: error.message,
    })
    return { status: 'unavailable', reason: 'pending_services query failed' }
  }
  if (!row) {
    priceLog.error('services validation: no pending_services row', { reference })
    return { status: 'unavailable', reason: 'no pending_services row' }
  }

  const parsedServices = pendingServicesReadSchema.safeParse(row.services)
  if (!parsedServices.success) {
    priceLog.error('services validation: malformed pending payload', {
      reference,
      issues: parsedServices.error.issues,
    })
    return { status: 'unavailable', reason: 'malformed pending services payload' }
  }
  const services = parsedServices.data
  // Fail fast: read schema is intentionally loose (min(0)) so legacy empty
  // rows don't crash the parser. Independent guard here so we don't compute
  // a 0-cent expected and rely on the upstream `amount > 0` invariant.
  if (services.length === 0) {
    priceLog.error('services validation: pending payload has zero services', { reference })
    return { status: 'unavailable', reason: 'empty pending services' }
  }

  let reservation: ReservationValidationData | null = null
  let lastRetryableReason: string | null = null
  for (let attempt = 1; attempt <= MAX_APALEO_ATTEMPTS; attempt++) {
    const outcome = await fetchReservationForValidation(row.reservation_id)
    if (outcome.kind === 'ok') {
      reservation = outcome.data
      break
    }
    if (outcome.kind === 'not-found') {
      return { status: 'unavailable', reason: `reservation: ${outcome.reason}` }
    }
    lastRetryableReason = outcome.reason
    if (attempt < MAX_APALEO_ATTEMPTS) await sleep(attempt * 1000)
  }
  if (!reservation) {
    apaleoLog.error('services validation: reservation fetch exhausted retries', {
      reservationId: row.reservation_id,
      lastRetryableReason,
    })
    return { status: 'unavailable', reason: 'reservation fetch failed' }
  }

  // Idempotency guard for stay extensions (LCO/ECI). They are applied as a
  // reservation amend (the time becomes 13:00), NOT a folio service — so a
  // second purchase wouldn't be hidden by reservation.services and would amend
  // to an unchanged time, i.e. pay-then-refund. Refuse here so make-payment
  // returns 503 BEFORE any Adyen authorization (and the webhook re-validation
  // catches an auth that somehow slipped through, refunding it).
  for (const service of services) {
    const ext = isStayExtensionService(service.serviceId)
    if (ext === 'late' && reservation.departureTime === '13:00') {
      priceLog.error('services validation: late check-out already applied — refusing', {
        reference,
        reservationId: row.reservation_id,
      })
      return { status: 'unavailable', reason: 'late check-out already applied' }
    }
    // ECI is "already applied" whenever arrival is EARLIER than the 15:00
    // default — nothing left to sell. Not a strict `=== '13:00'`: the
    // Room-Ready webhook moves arrivals to 13:00+ (e.g. 13:47) when the room
    // is cleaned early; an exact match would miss that and charge the guest
    // for nothing (live Adyen). Zero-padded HH:mm ⇒ lexical `<` works.
    if (ext === 'early' && reservation.arrivalTime !== '' && reservation.arrivalTime < '15:00') {
      priceLog.error('services validation: early check-in already applied — refusing', {
        reference,
        reservationId: row.reservation_id,
      })
      return { status: 'unavailable', reason: 'early check-in already applied' }
    }
    // Same-day sale deadline: past 13:00 Berlin on the arrival day the ECI
    // product can no longer deliver anything (it moves arrival to 13:00, which
    // is already in the past) — refuse BEFORE any Adyen authorization. Auth
    // phase ONLY: re-checking it in the webhook would refund a legitimate
    // 12:55 purchase whose webhook landed at 13:03.
    if (phase === 'auth' && ext === 'early' && reservation.arrival === berlinToday() && berlinNowHHmm() >= '13:00') {
      priceLog.error('services validation: early check-in past 13:00 on arrival day — refusing', {
        reference,
        reservationId: row.reservation_id,
      })
      return { status: 'unavailable', reason: 'early check-in no longer available today' }
    }
  }

  // Departure-day / post-stay: no stay night remains, so any night-based
  // service would be booked on the departure date — OUTSIDE the stay — and
  // Apaleo rejects it AFTER the charge (charge-then-refund). Stay extensions
  // (LCO/ECI) are the only sellable services here: a single amend,
  // night-independent, legitimately bought on departure morning.
  if (reservation.extrasWindowEnded) {
    const nightBased = services.find(s => !isStayExtensionService(s.serviceId))
    if (nightBased) {
      priceLog.error('services validation: stay window ended — refusing night-based service', {
        reference,
        serviceId: nightBased.serviceId,
      })
      return { status: 'unavailable', reason: 'stay window ended' }
    }
  }

  let catalog: Awaited<ReturnType<typeof getApaleoExtras>>
  try {
    catalog = await getApaleoExtras(reservation.arrival, reservation.departure, 'en')
  } catch (err) {
    apaleoLog.warn('services validation: extras catalog fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { status: 'unavailable', reason: 'extras catalog fetch failed' }
  }
  if (!catalog || catalog.length === 0) {
    return { status: 'unavailable', reason: 'empty extras catalog' }
  }

  let result: ReturnType<typeof computeServicesTotalCents>
  try {
    result = computeServicesTotalCents(
      services,
      catalog,
      // Remaining-nights window — matches what the cabinet client displayed
      // and charged (see extrasStart/extrasNights above).
      { nights: reservation.extrasNights },
      reservation.existingCleaningDates,
    )
  } catch (err) {
    if (err instanceof UnknownServiceError) {
      priceLog.error('services validation: unknown service in pending payload', {
        reference,
        serviceId: err.serviceId,
      })
      return { status: 'unavailable', reason: `service ${err.serviceId} not in catalog` }
    }
    priceLog.error('services validation: computation threw', {
      reference,
      error: err instanceof Error ? err.message : String(err),
    })
    return { status: 'unavailable', reason: 'services computation failed' }
  }

  const expectedCents = result.totalCents
  if (expectedCents !== clientAmountCents) {
    priceLog.error('💰 services amount mismatch — rejecting payment', {
      reference,
      reservationId: row.reservation_id,
      clientCents: clientAmountCents,
      expectedCents,
      diffCents: clientAmountCents - expectedCents,
      breakdown: result.breakdown,
    })
    return {
      status: 'mismatch',
      clientCents: clientAmountCents,
      expectedCents,
      breakdown: result.breakdown,
    }
  }

  // Build the Apaleo payloads from the SAME services + catalog + nights the
  // amount was just validated against. nightDates spans extrasStart ..
  // departure-1 (exactly `extrasNights` dates) so daily services book on every
  // REMAINING night — never on nights already slept — and the folio total
  // equals expectedCents.
  const nightDates = Array.from({ length: reservation.extrasNights }, (_, i) =>
    dayjs(reservation.extrasStart).add(i, 'day').format('YYYY-MM-DD'),
  )
  const apaleoServices = buildApaleoServicePayloads(
    services,
    catalog,
    { nightDates },
    reservation.existingCleaningDates,
  )

  priceLog.success('💰 services amount valid', {
    reference,
    clientCents: clientAmountCents,
    expectedCents,
  })
  return {
    status: 'valid',
    clientCents: clientAmountCents,
    expectedCents,
    apaleoServices,
  }
}
