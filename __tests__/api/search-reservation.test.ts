import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Fetch } from '@/services/Request';
import { GET } from '@/app/api/reservations/search-reservation/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockFetch = vi.mocked(Fetch);

const fakeReservation = {
  id: 'RCMH-SEARCH', property: { id: 'CMH' }, // CharlieM property
  primaryGuest: { email: 'user@test.com', lastName: 'Smith' },
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

function makeRequest(reservationId?: string, lastName: string | null = 'Smith') {
  const params = new URLSearchParams();
  if (reservationId) params.set('reservationId', reservationId);
  if (lastName) params.set('lastName', lastName);
  const qs = params.toString();
  return new NextRequest(`http://localhost/api/reservations/search-reservation${qs ? `?${qs}` : ''}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(fakeReservation as any);
});

describe('GET /api/reservations/search-reservation (CharlieM)', () => {
  it('returns 400 when reservationId missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    expect((await GET(makeRequest())).status).toBe(400);
  });

  it('returns 400 when lastName missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    expect((await GET(makeRequest('RCMH-TEST', null))).status).toBe(400);
  });

  it('returns 404 when lastName does not match the reservation', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    expect((await GET(makeRequest('RCMH-MINE', 'WrongName'))).status).toBe(404);
  });

  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    expect((await GET(makeRequest('RCMH-TEST'))).status).toBe(401);
  });

  it('returns 409 when reservation already added', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }, { id: 1 }));
    const res = await GET(makeRequest('RCMH-DUP'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('already_added');
  });

  it('returns 404 when Apaleo throws 404', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockFetch.mockRejectedValue(new Error('404 not found'));
    expect((await GET(makeRequest('RCMH-MISS'))).status).toBe(404);
  });

  it('returns 404 when reservation belongs to different property (MOT not CMH)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockFetch.mockResolvedValue({ ...fakeReservation, property: { id: 'MOT' } } as any);
    expect((await GET(makeRequest('RMOT-WRONG'))).status).toBe(404);
  });

  it('returns 200 with emailBelongsToUser=true when emails match', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    const res = await GET(makeRequest('RCMH-MINE'));
    expect(res.status).toBe(200);
    expect((await res.json()).emailBelongsToUser).toBe(true);
  });

  it('returns 200 with emailBelongsToUser=false when emails differ', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'other@test.com' }));
    const res = await GET(makeRequest('RCMH-NOTMINE'));
    expect(res.status).toBe(200);
    expect((await res.json()).emailBelongsToUser).toBe(false);
  });
});
