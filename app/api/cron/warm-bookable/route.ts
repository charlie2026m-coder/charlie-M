import { getBookableDepartures } from '@/app/actions/apaleo/rooms/getBookableDepartures';
import { getMonthAvailability } from '@/app/actions/apaleo/getMonthAvailability';
import { roomsDetails } from '@/content/RoomsDetails';

// Background warmer: keeps the bookable-checkout cache (unstable_cache behind
// getBookableDepartures) hot so a guest's calendar pick is served from cache
// (~150 ms) instead of a cold ~1.3 s Apaleo offers probe. Runs on a Vercel cron
// (see vercel.json). Read-only and cache-bounded — repeated hits within the TTL
// cost nothing (cache hits), only a post-TTL hit re-probes Apaleo.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Studio unit-group ids, derived from the room content so the warmer stays in
// sync with the room set. TODO(Charlie M): confirm these match the Apaleo
// unit-group ids once the property is wired (Phase 2). Until APALEO_PROPERTY_ID
// is set, getBookableDepartures/getMonthAvailability short-circuit to empty, so
// this cron is a harmless no-op pre-launch.
const UNIT_GROUPS = roomsDetails.map((r) => r.id);
const DAYS = 45;
// 8 arrivals in flight, each a 14-wide probe → up to ~112 concurrent Apaleo
// calls per context. Apaleo handles this fine; keeps a full warm run well under
// the 60s function budget.
const ARRIVAL_CONCURRENCY = 8;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

async function warmContext(
  arrivals: string[],
  unitGroupId: string | undefined,
  guests: number,
): Promise<number> {
  let i = 0;
  let warmed = 0;
  const workers = Array.from({ length: ARRIVAL_CONCURRENCY }, async () => {
    while (i < arrivals.length) {
      const a = arrivals[i++];
      try {
        await getBookableDepartures(a, guests, unitGroupId);
        warmed++;
      } catch {
        /* skip — a transient failure just leaves that key cold for next run */
      }
    }
  });
  await Promise.all(workers);
  return warmed;
}

export async function GET(req: Request) {
  // Fail CLOSED, like /api/revalidate-rooms. Read-only, but every call fans out
  // into Apaleo offer requests — leaving it open without CRON_SECRET is a free
  // way to burn the API quota.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const fromYmd = ymd(today);
  const toYmd = ymd(addDays(today, DAYS));
  const allDates = Array.from({ length: DAYS }, (_, k) => ymd(addDays(today, k)));

  const skipSoldOut = async (unitGroupId?: string) => {
    const avail = await getMonthAvailability(fromYmd, toYmd, unitGroupId).catch(() => []);
    const soldOut = new Set(avail.filter((d) => !d.available).map((d) => d.date));
    return allDates.filter((d) => !soldOut.has(d));
  };

  const warmed: Record<string, number> = {};
  // Property-wide search calendar for the common party sizes (the hook keys the
  // cache by the chosen adult count). 1 + 2 cover virtually all searches.
  const propArrivals = await skipSoldOut();
  warmed['property-1'] = await warmContext(propArrivals, undefined, 1);
  warmed['property-2'] = await warmContext(propArrivals, undefined, 2);
  // Each studio type (the unit-page calendars probe with 1).
  for (const ug of UNIT_GROUPS) {
    warmed[ug] = await warmContext(await skipSoldOut(ug), ug, 1);
  }

  return Response.json({ ok: true, from: fromYmd, to: toYmd, warmed });
}
