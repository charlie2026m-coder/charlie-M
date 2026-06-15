'use server';
import { Fetch } from '@/services/Request';

const propId = process.env.APALEO_PROPERTY_ID;

export interface DayAvailability {
  /** Night date, YYYY-MM-DD (the night that starts on this day). */
  date: string;
  /** Bookable units that night (property-wide, or for a single unit group). */
  count: number;
  available: boolean;
}

interface UnitGroupAvailabilityResponse {
  timeSlices?: Array<{
    from?: string;
    property?: { sellableCount?: number; soldCount?: number };
    unitGroups?: Array<{
      unitGroup?: { id?: string };
      availableCount?: number;
    }>;
  }>;
}

/**
 * Real per-night availability from Apaleo for the [from, to) range.
 *
 * Source of truth: GET /availability/v1/unit-groups returns one timeSlice per
 * night with `availableCount` per unit group. We report bookable units per
 * night — for a single unit group when `unitGroupId` is given (the room page),
 * or summed across all groups (the property-wide search calendar = "is any
 * room free that night").
 *
 * `from`/`to` are YYYY-MM-DD; `to` is exclusive (the last checkout night).
 */
export async function getMonthAvailability(
  from: string,
  to: string,
  unitGroupId?: string,
): Promise<DayAvailability[]> {
  if (!propId || !from || !to) return [];

  // NOTE: an Apaleo failure is RE-THROWN, not swallowed into []. The caller
  // (useMonthAvailability) needs the rejection to fire its retry; swallowing it
  // here cached an empty window as "success" so the retry never ran and
  // sold-out nights silently rendered as available for the whole session
  // (review finding #3). Unknown dates already default to selectable in the
  // hook, so a propagated failure degrades safely (no data) AND retries.
  try {
    const res = await Fetch<UnitGroupAvailabilityResponse>(
      `/availability/v1/unit-groups?propertyId=${propId}&from=${from}&to=${to}`,
    );

    return (res.timeSlices ?? [])
      .filter((ts) => typeof ts.from === 'string')
      .map((ts) => {
        const date = ts.from!.slice(0, 10);
        let count: number;
        if (unitGroupId) {
          count =
            ts.unitGroups?.find((g) => g.unitGroup?.id === unitGroupId)?.availableCount ?? 0;
        } else {
          count = (ts.unitGroups ?? []).reduce((sum, g) => sum + (g.availableCount ?? 0), 0);
        }
        return { date, count, available: count > 0 };
      });
  } catch (error) {
    console.error('getMonthAvailability error:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}
