'use server';
import { Fetch } from '@/services/Request';
import { OfferResponse } from '@/types/offers';
import { unstable_cache } from 'next/cache';

const propId = process.env.APALEO_PROPERTY_ID;

export interface BookableDepartures {
  /** Bookable checkout dates (YYYY-MM-DD); each yields at least one real offer. */
  departures: string[];
  /** Smallest bookable stay length in nights, or null if none within the window. */
  minNights: number | null;
  /** Largest bookable stay length found within the probed window, or null. */
  maxNights: number | null;
  /** How many nights ahead were probed — checkouts BEYOND this weren't tested,
   *  so callers must treat them as unknown (not "unavailable"). */
  windowNights: number;
}

/** How many nights ahead of the arrival to probe for bookable checkouts. */
const WINDOW_NIGHTS = 14;
/** Probe ALL stay lengths for one arrival in a single parallel round. A single
 *  Apaleo offers call is latency-bound (~1.3 s), so batching was the main source
 *  of the calendar's lag. Apaleo handles a 14-wide burst fine; one arrival = one round. */
const CONCURRENCY = WINDOW_NIGHTS;
/** Shared server cache TTL. Min/max-stay rules barely change; the moving part is
 *  the upper bound (a room books up), and the search itself re-validates on
 *  submit — so ~30 min staleness is safe and makes repeat picks instant. */
const CACHE_TTL_SECONDS = 1800;

/** Local-safe day math on a YYYY-MM-DD string (UTC noon avoids DST edges). */
function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function probe(
  arrival: string,
  n: number,
  adults: number,
  unitGroupId?: string,
): Promise<boolean> {
  const dep = addDaysYmd(arrival, n);
  // NB: a genuine Apaleo failure THROWS here (Fetch rejects on non-2xx). We let
  // it propagate so the caller's cache never stores a half-empty result from a
  // transient blip; "no offer" (HTTP 204 → {}) is NOT an error and correctly
  // reads as "not bookable for this length".
  const res = await Fetch<OfferResponse>(
    `/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${dep}&channelCode=Ibe&adults=${adults}`,
  );
  const offers = res.offers ?? [];
  return unitGroupId
    ? offers.some((o) => o.unitGroup?.id === unitGroupId && (o.availableUnits ?? 0) >= 1)
    : offers.some((o) => (o.availableUnits ?? 0) >= 1);
}

async function computeBookableDepartures(
  arrival: string,
  adults: number,
  unitGroupId: string | undefined,
): Promise<BookableDepartures> {
  const lengths = Array.from({ length: WINDOW_NIGHTS }, (_, i) => i + 1);
  const results: { n: number; ok: boolean }[] = [];

  // A thrown probe (real failure) rejects the whole compute → not cached → caller
  // stays optimistic and retries; a clean run is cached and shared across users.
  for (let i = 0; i < lengths.length; i += CONCURRENCY) {
    const batch = lengths.slice(i, i + CONCURRENCY);
    const oks = await Promise.all(batch.map((n) => probe(arrival, n, adults, unitGroupId)));
    batch.forEach((n, j) => results.push({ n, ok: oks[j] }));
  }

  const valid = results.filter((r) => r.ok).map((r) => r.n);
  return {
    departures: valid.map((n) => addDaysYmd(arrival, n)),
    minNights: valid.length ? Math.min(...valid) : null,
    maxNights: valid.length ? Math.max(...valid) : null,
    windowNights: WINDOW_NIGHTS,
  };
}

/**
 * For a given ARRIVAL date, returns which checkout dates are actually bookable
 * according to Apaleo's offers endpoint — the only source that honours rate-plan
 * restrictions (min/max length of stay, closed-to-arrival/departure). The raw
 * `/availability/v1/unit-groups` counts the calendar uses for greying know only
 * PHYSICAL inventory, so without this a guest could pick a 1-night stay on a
 * 2-night-minimum weekend and dead-end on "No rooms found".
 *
 * Wrapped in `unstable_cache`: the (expensive) probing runs at most once per
 * (arrival, guests, unitGroup) per TTL and the result is shared across every
 * visitor — so after warm-up (and the calendar's background prefetch) picking a
 * check-in is instant, with no per-click round-trip.
 */
export async function getBookableDepartures(
  arrival: string,
  guests: number = 1,
  unitGroupId?: string,
): Promise<BookableDepartures> {
  if (!propId || !arrival)
    return { departures: [], minNights: null, maxNights: null, windowNights: WINDOW_NIGHTS };
  const adults = Math.max(1, guests);

  const cached = unstable_cache(
    () => computeBookableDepartures(arrival, adults, unitGroupId),
    ['bookable-departures', arrival, String(adults), unitGroupId ?? ''],
    { revalidate: CACHE_TTL_SECONDS, tags: ['apaleo-bookable'] },
  );
  return cached();
}
