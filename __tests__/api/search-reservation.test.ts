import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Fetch } from '@/services/Request';
import { GET } from '@/app/api/reservations/search-reservation/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockFetch = vi.mocked(Fetch);

// Mock reservation now carries a last name so the second-factor check can pass.
const fakeReservation = {
  id: 'RCMH-SEARCH', property: { id: 'CMH' }, // CharlieM property
  primaryGuest: { email: 'user@test.com', lastName: 'Tester' },
  booker: { lastName: 'Tester' },
  unitGroup: { id: 'CMH-SGB', name: 'Studio' },
  adults: 1,
};

function makeSupabase(user: object | null, existingReservation: object | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existingReservation });
  const eq2 = vi.fn().mockReturnValue({ maybeSingle });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1, order: vi.fn().mockResolvedValue({ data: [] }) });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockReturnValue({ select }),
  } as any;
}

// Unique IP per request so the route's module-level in-memory rate limiter
// (10 / IP / 10 min) never accumulates across test cases and trips a 429.
let ipCounter = 0;
function makeRequest(opts: { reservationId?: string; lastName?: string } = {}) {
  const qs = new URLSearchParams();
  if (opts.reservationId) qs.set('reservationId', opts.reservationId);
  if (opts.lastName) qs.set('lastName', opts.lastName);
  return new NextRequest(`http://localhost/api/reservations/search-reservation?${qs.toString()}`, {
    headers: { 'x-forwarded-for': `10.0.0.${++ipCounter}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(fakeReservation as any);
});

describe('GET /api/reservations/search-reservation (CharlieM)', () => {
  it('returns 400 when reservationId missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    expect((await GET(makeRequest({ lastName: 'Tester' }))).status).toBe(400);
  });

  it('returns 400 when lastName missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    expect((await GET(makeRequest({ reservationId: 'RCMH-TEST' }))).status).toBe(400);
  });

  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    expect((await GET(makeRequest({ reservationId: 'RCMH-TEST', lastName: 'Tester' }))).status).toBe(401);
  });

  it('returns 404 when Apaleo throws 404', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockFetch.mockRejectedValue(new Error('404 not found'));
    expect((await GET(makeRequest({ reservationId: 'RCMH-MISS', lastName: 'Tester' }))).status).toBe(404);
  });

  it('returns 404 when reservation belongs to different property (MOT not CMH)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockFetch.mockResolvedValue({ ...fakeReservation, property: { id: 'MOT' } } as any);
    expect((await GET(makeRequest({ reservationId: 'RMOT-WRONG', lastName: 'Tester' }))).status).toBe(404);
  });

  it('returns 404 (neutral) when last name does not match', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    const res = await GET(makeRequest({ reservationId: 'RCMH-SEARCH', lastName: 'WrongName' }));
    expect(res.status).toBe(404);
  });

  it('matches last name case/diacritic/format-insensitively', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    // mock guest "Tester" vs typed "  tEsTeR " still passes
    const res = await GET(makeRequest({ reservationId: 'RCMH-SEARCH', lastName: '  tEsTeR ' }));
    expect(res.status).toBe(200);
  });

  it('returns 409 when reservation already added (after name verified)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }, { id: 1 }));
    const res = await GET(makeRequest({ reservationId: 'RCMH-DUP', lastName: 'Tester' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('already_added');
  });

  it('returns 200 with emailBelongsToUser=true when emails match', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    const res = await GET(makeRequest({ reservationId: 'RCMH-MINE', lastName: 'Tester' }));
    expect(res.status).toBe(200);
    expect((await res.json()).emailBelongsToUser).toBe(true);
  });

  it('returns 200 with emailBelongsToUser=false when emails differ', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'other@test.com' }));
    const res = await GET(makeRequest({ reservationId: 'RCMH-NOTMINE', lastName: 'Tester' }));
    expect(res.status).toBe(200);
    expect((await res.json()).emailBelongsToUser).toBe(false);
  });
});
