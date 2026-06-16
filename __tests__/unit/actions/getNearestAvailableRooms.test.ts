import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));
vi.mock('@/app/actions/apaleo/rooms/getPrices', () => ({ getPrices: vi.fn() }));
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  // Pin "today" so date math is deterministic.
  return { ...actual, getMinArrivalDate: () => new Date(2026, 5, 15) }; // 2026-06-15 local
});

import { Fetch } from '@/services/Request';
import { getPrices } from '@/app/actions/apaleo/rooms/getPrices';
import { fetchNearestAvailableRooms } from '@/app/actions/apaleo/rooms/getNearestAvailableRooms';

const mockFetch = vi.mocked(Fetch);
const mockGetPrices = vi.mocked(getPrices);

function slice(from: string, groups: Record<string, number>) {
  return {
    from: `${from}T00:00:00Z`,
    unitGroups: Object.entries(groups).map(([id, availableCount]) => ({
      unitGroup: { id },
      availableCount,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPrices.mockResolvedValue([]);
});

describe('fetchNearestAvailableRooms', () => {
  it('returns the EARLIEST available night per unit group with its price', async () => {
    mockFetch.mockResolvedValueOnce({
      timeSlices: [
        slice('2026-06-15', { 'CMH-CDR': 5, 'CMH-SPK': 0 }), // SPK not free tonight
        slice('2026-06-16', { 'CMH-CDR': 5, 'CMH-SPK': 3 }), // SPK first free tomorrow
      ],
    } as never);
    mockGetPrices.mockImplementation(async (from?: string) => {
      if (from === '2026-06-15') return [{ roomId: 'CMH-CDR', minNightPrice: 171 }];
      if (from === '2026-06-16') return [{ roomId: 'CMH-SPK', minNightPrice: 120 }];
      return [];
    });

    const rooms = await fetchNearestAvailableRooms();
    const byId = Object.fromEntries(rooms.map((r) => [r.roomId, r]));

    expect(byId['CMH-CDR']).toMatchObject({ arrival: '2026-06-15', departure: '2026-06-16', oneNightPrice: 171 });
    expect(byId['CMH-SPK']).toMatchObject({ arrival: '2026-06-16', departure: '2026-06-17', oneNightPrice: 120 });
  });

  it('KEEPS an available room with no published offer (price 0), so the feed is not hidden', async () => {
    mockFetch.mockResolvedValueOnce({
      timeSlices: [slice('2026-06-15', { 'CMH-CDR': 5, 'CMH-COR': 4 })],
    } as never);
    // Only CDR has an offer; COR is free but has no rate plan on the channel.
    mockGetPrices.mockResolvedValue([{ roomId: 'CMH-CDR', minNightPrice: 171 }]);

    const rooms = await fetchNearestAvailableRooms();
    const cor = rooms.find((r) => r.roomId === 'CMH-COR');
    expect(cor).toMatchObject({ arrival: '2026-06-15', oneNightPrice: 0 });
    expect(rooms.find((r) => r.roomId === 'CMH-CDR')?.oneNightPrice).toBe(171);
  });

  it('excludes rooms with zero availability across the whole window', async () => {
    mockFetch.mockResolvedValueOnce({
      timeSlices: [
        slice('2026-06-15', { 'CMH-CDR': 5, 'CMH-BUK': 0 }),
        slice('2026-06-16', { 'CMH-CDR': 5, 'CMH-BUK': 0 }),
      ],
    } as never);
    const rooms = await fetchNearestAvailableRooms();
    expect(rooms.some((r) => r.roomId === 'CMH-BUK')).toBe(false);
    expect(rooms.some((r) => r.roomId === 'CMH-CDR')).toBe(true);
  });

  it('prices each distinct nearest date once (groups sharing a date are batched)', async () => {
    mockFetch.mockResolvedValueOnce({
      timeSlices: [slice('2026-06-15', { 'CMH-CDR': 5, 'CMH-SPK': 5, 'CMH-COR': 5 })],
    } as never);
    await fetchNearestAvailableRooms();
    // All three share 2026-06-15 → a single getPrices call.
    expect(mockGetPrices).toHaveBeenCalledTimes(1);
    expect(mockGetPrices).toHaveBeenCalledWith('2026-06-15', '2026-06-16', 1);
  });

  it('returns [] when Apaleo availability fails (no crash)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Apaleo API error: 503 - {}'));
    expect(await fetchNearestAvailableRooms()).toEqual([]);
  });

  it('on production (VERCEL_ENV=production) hides rooms without a price (bookable-only)', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    mockFetch.mockResolvedValueOnce({
      timeSlices: [slice('2026-06-15', { 'CMH-CDR': 5, 'CMH-COR': 4 })],
    } as never);
    mockGetPrices.mockResolvedValue([{ roomId: 'CMH-CDR', minNightPrice: 171 }]);

    const rooms = await fetchNearestAvailableRooms();
    expect(rooms.map((r) => r.roomId)).toEqual(['CMH-CDR']); // COR (price 0) hidden
    vi.unstubAllEnvs();
  });

  it('off production (no VERCEL_ENV) keeps unpriced available rooms', async () => {
    // (test env has no VERCEL_ENV) — both rooms shown.
    mockFetch.mockResolvedValueOnce({
      timeSlices: [slice('2026-06-15', { 'CMH-CDR': 5, 'CMH-COR': 4 })],
    } as never);
    mockGetPrices.mockResolvedValue([{ roomId: 'CMH-CDR', minNightPrice: 171 }]);

    const rooms = await fetchNearestAvailableRooms();
    expect(rooms.map((r) => r.roomId).sort()).toEqual(['CMH-CDR', 'CMH-COR']);
  });
});
