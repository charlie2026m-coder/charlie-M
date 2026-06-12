import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));

import { Fetch } from '@/services/Request';
import { listUnits, findCurrentInhouse, fullReservation } from '@/services/selfCheckout';

const mockFetch = vi.mocked(Fetch);
const TODAY = '2026-06-12';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listUnits', () => {
  it('paginates until a short page', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `U${i}`, name: `Room ${i}` }));
    const page2 = Array.from({ length: 25 }, (_, i) => ({ id: `V${i}`, name: `Room ${100 + i}` }));
    mockFetch
      .mockResolvedValueOnce({ units: page1 })
      .mockResolvedValueOnce({ units: page2 });

    const units = await listUnits();
    expect(units).toHaveLength(125);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0][0])).toContain('pageNumber=1');
    expect(String(mockFetch.mock.calls[1][0])).toContain('pageNumber=2');
    expect(String(mockFetch.mock.calls[0][0])).toContain('propertyId=CMH');
  });

  it('falls back to the unit id when the name is missing', async () => {
    mockFetch.mockResolvedValueOnce({ units: [{ id: 'U1' }] });
    const units = await listUnits();
    expect(units).toEqual([{ id: 'U1', name: 'U1' }]);
  });
});

describe('findCurrentInhouse', () => {
  it('queries Apaleo with the Stay date filter for today', async () => {
    mockFetch.mockResolvedValueOnce({ reservations: [] });
    await findCurrentInhouse('U7', TODAY);
    const endpoint = String(mockFetch.mock.calls[0][0]);
    expect(endpoint).toContain('propertyIds=CMH');
    expect(endpoint).toContain('unitIds=U7');
    expect(endpoint).toContain('dateFilter=Stay');
    expect(endpoint).toContain('status=InHouse');
    expect(endpoint).toContain(encodeURIComponent(`${TODAY}T00:00:00Z`));
    expect(endpoint).toContain(encodeURIComponent(`${TODAY}T23:59:59Z`));
  });

  it('matches via unit.id', async () => {
    mockFetch.mockResolvedValueOnce({
      reservations: [
        { id: 'R1', status: 'InHouse', departure: `${TODAY}T11:00:00+02:00`, unit: { id: 'U7' } },
      ],
    });
    const head = await findCurrentInhouse('U7', TODAY);
    expect(head?.id).toBe('R1');
  });

  it('matches via assignedUnits when unit.id differs', async () => {
    mockFetch.mockResolvedValueOnce({
      reservations: [
        {
          id: 'R2',
          status: 'InHouse',
          departure: '2026-06-14T11:00:00+02:00',
          unit: { id: 'OTHER' },
          assignedUnits: [{ unit: { id: 'U7' } }],
        },
      ],
    });
    const head = await findCurrentInhouse('U7', TODAY);
    expect(head?.id).toBe('R2');
  });

  it('skips reservations of other units, past departures and non-InHouse', async () => {
    mockFetch.mockResolvedValueOnce({
      reservations: [
        { id: 'R3', status: 'InHouse', departure: `${TODAY}T11:00:00+02:00`, unit: { id: 'ELSE' } },
        { id: 'R4', status: 'InHouse', departure: '2026-06-11T11:00:00+02:00', unit: { id: 'U7' } },
        { id: 'R5', status: 'Confirmed', departure: '2026-06-14T11:00:00+02:00', unit: { id: 'U7' } },
      ],
    });
    expect(await findCurrentInhouse('U7', TODAY)).toBeNull();
  });

  it('returns null on an empty (204) response', async () => {
    mockFetch.mockResolvedValueOnce({});
    expect(await findCurrentInhouse('U7', TODAY)).toBeNull();
  });
});

describe('fullReservation', () => {
  it('returns the reservation when it belongs to this property', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'R1', property: { id: 'CMH' } });
    const resv = await fullReservation('R1');
    expect(resv?.id).toBe('R1');
  });

  it('rejects reservations from the other hotel on the shared account', async () => {
    mockFetch.mockResolvedValueOnce({ id: 'R9', property: { id: 'M19' } });
    expect(await fullReservation('R9')).toBeNull();
  });
});
