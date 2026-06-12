import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIp: vi.fn(() => '1.2.3.4'),
}));

vi.mock('@/services/Request', () => ({
  Fetch: vi.fn(),
}));

import { checkRateLimit } from '@/lib/rateLimit';
import { Fetch } from '@/services/Request';
import { GET } from '@/app/api/bookings/search/route';

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockFetch = vi.mocked(Fetch);

function makeRequest(externalCode?: string, lastName?: string) {
  const params = new URLSearchParams();
  if (externalCode) params.set('externalCode', externalCode);
  if (lastName) params.set('lastName', lastName);
  return new NextRequest(`http://localhost/api/bookings/search?${params}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue(true);
});

describe('GET /api/bookings/search (CharlieM only)', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue(false);
    const res = await GET(makeRequest('EXT-001', 'Smith'));
    expect(res.status).toBe(429);
  });

  it('returns 400 when externalCode missing', async () => {
    const res = await GET(makeRequest(undefined, 'Smith'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when lastName missing', async () => {
    const res = await GET(makeRequest('EXT-001'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when both Apaleo methods fail', async () => {
    mockFetch.mockRejectedValue(new Error('not found'));
    const res = await GET(makeRequest('EXT-001', 'Smith'));
    expect(res.status).toBe(404);
  });

  it('returns 200 when external code search succeeds AND the last name verifies', async () => {
    mockFetch
      .mockResolvedValueOnce({
        bookings: [{ id: 'B-001', booker: { lastName: 'Smith' }, reservationIds: ['R-1'] }],
      } as any)
      .mockRejectedValueOnce(new Error('no direct')); // second method fails
    const res = await GET(makeRequest('EXT-001', 'Smith'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking).toMatchObject({ id: 'B-001' });
  });

  it('fuzzy textSearch hit with a DIFFERENT last name → 404 (review finding #2)', async () => {
    // Apaleo textSearch is fuzzy — it can return a booking whose name merely
    // resembles the input. Without local verification this leaked bookings.
    mockFetch
      .mockResolvedValueOnce({
        bookings: [{ id: 'B-LEAK', booker: { lastName: 'Smithson' }, reservations: [] }],
      } as any)
      .mockRejectedValueOnce(new Error('no direct'));
    const res = await GET(makeRequest('EXT-001', 'Smith'));
    expect(res.status).toBe(404);
  });

  it('matches via a reservation primary guest when the booker name differs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        bookings: [
          {
            id: 'B-GUEST',
            booker: { lastName: 'Agency' },
            reservations: [{ primaryGuest: { lastName: 'Müller' } }],
          },
        ],
      } as any)
      .mockRejectedValueOnce(new Error('no direct'));
    const res = await GET(makeRequest('EXT-001', 'Mueller'));
    expect(res.status).toBe(200);
    expect((await res.json()).booking.id).toBe('B-GUEST');
  });

  it('uses Promise.any — succeeds if either search method works', async () => {
    // First method fails (no bookings), second method succeeds (lastName matches)
    mockFetch
      .mockResolvedValueOnce({ bookings: [] } as any) // first method: no match
      .mockResolvedValueOnce({ id: 'B-002', booker: { lastName: 'Smith' }, reservationIds: [] } as any); // second: match
    const res = await GET(makeRequest('B-002', 'Smith'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.id).toBe('B-002');
  });

  it('lastName mismatch in direct search → 404', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('not found')) // external code fails
      .mockResolvedValueOnce({ id: 'B-003', booker: { lastName: 'Jones' } } as any); // different lastName
    const res = await GET(makeRequest('B-003', 'Smith'));
    expect(res.status).toBe(404);
  });

  it('public endpoint — no auth required', async () => {
    mockFetch.mockResolvedValueOnce({
      bookings: [{ id: 'B-PUBLIC', booker: { lastName: 'Doe' } }],
    } as any);
    // No session needed — route doesn't check auth
    const res = await GET(makeRequest('EXT-PUBLIC', 'Doe'));
    expect(res.status).toBe(200);
  });
});
