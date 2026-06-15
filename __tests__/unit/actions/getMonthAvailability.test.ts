import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));

import { Fetch } from '@/services/Request';
import { getMonthAvailability } from '@/app/actions/apaleo/getMonthAvailability';

const mockFetch = vi.mocked(Fetch);

const SAMPLE = {
  timeSlices: [
    {
      from: '2026-07-08T15:00:00+02:00',
      property: { sellableCount: 100, soldCount: 0 },
      unitGroups: [
        { unitGroup: { id: 'CMH-SGB' }, availableCount: 14 },
        { unitGroup: { id: 'CMH-BUK' }, availableCount: 0 },
      ],
    },
    {
      from: '2026-07-09T15:00:00+02:00',
      property: { sellableCount: 100, soldCount: 100 },
      unitGroups: [
        { unitGroup: { id: 'CMH-SGB' }, availableCount: 0 },
        { unitGroup: { id: 'CMH-BUK' }, availableCount: 0 },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(SAMPLE as any);
});

describe('getMonthAvailability', () => {
  it('property-wide: sums availableCount across all unit groups per night', async () => {
    const days = await getMonthAvailability('2026-07-08', '2026-07-10');
    expect(days).toEqual([
      { date: '2026-07-08', count: 14, available: true },
      { date: '2026-07-09', count: 0, available: false },
    ]);
  });

  it('single unit group: reports only that group, per night', async () => {
    const days = await getMonthAvailability('2026-07-08', '2026-07-10', 'CMH-SGB');
    expect(days).toEqual([
      { date: '2026-07-08', count: 14, available: true },
      { date: '2026-07-09', count: 0, available: false },
    ]);
  });

  it('a unit group with zero inventory is sold out every night', async () => {
    const days = await getMonthAvailability('2026-07-08', '2026-07-10', 'CMH-BUK');
    expect(days.every((d) => !d.available && d.count === 0)).toBe(true);
  });

  it('passes the property id and date range to Apaleo', async () => {
    await getMonthAvailability('2026-07-08', '2026-07-10', 'CMH-SGB');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/availability/v1/unit-groups?propertyId=CMH&from=2026-07-08&to=2026-07-10'),
    );
  });

  it('returns [] for missing dates (no Apaleo call)', async () => {
    expect(await getMonthAvailability('', '')).toEqual([]);
  });

  it('re-throws on Apaleo error so the caller can retry (#3)', async () => {
    // Swallowing the error into [] cached an empty window as success and the
    // hook never retried; the rejection must propagate.
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    await expect(getMonthAvailability('2026-07-08', '2026-07-10')).rejects.toThrow('boom');
  });
});
