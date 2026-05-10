import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));
vi.mock('@/lib/verifyReservationOwnership', () => ({ verifyReservationOwnership: vi.fn() }));
vi.mock('@/services/getReservationAccessesServer', () => ({
  getReservationAccessesServer: vi.fn().mockResolvedValue([]),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Fetch } from '@/services/Request';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { getReservationAccessesServer } from '@/services/getReservationAccessesServer';
import { GET } from '@/app/api/reservations/[id]/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockFetch = vi.mocked(Fetch);
const mockVerify = vi.mocked(verifyReservationOwnership);
const mockGuestway = vi.mocked(getReservationAccessesServer);

const validReservation = {
  id: 'RCMH-TEST', property: { id: 'CMH' },
  booker: { email: 'user@test.com' },
  unitGroup: { id: 'CMH-SGB', name: 'Studio' },
  adults: 2, services: [],
};

function makeSupabase(user: object | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [] }) }) }),
  } as any;
}

function makeRequest(id = 'RCMH-TEST') { return new NextRequest(`http://localhost/api/reservations/${id}`); }
function makeParams(id = 'RCMH-TEST') { return { params: Promise.resolve({ id }) }; }

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(validReservation as any);
  mockVerify.mockResolvedValue({ ok: true });
  mockGuestway.mockResolvedValue([]);
});

describe('GET /api/reservations/[id] (CharlieM)', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    expect((await GET(makeRequest(), makeParams())).status).toBe(401);
  });

  it('returns 404 when Apaleo throws 404', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    mockFetch.mockRejectedValue(new Error('404 not found'));
    expect((await GET(makeRequest(), makeParams())).status).toBe(404);
  });

  it('returns 404 for wrong property (not CMH)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    mockFetch.mockResolvedValue({ ...validReservation, property: { id: 'MOT' } } as any);
    expect((await GET(makeRequest(), makeParams())).status).toBe(404);
  });

  it('calls verifyOwnership with cachedBookerEmail', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    await GET(makeRequest(), makeParams());
    expect(mockVerify).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'RCMH-TEST', { cachedBookerEmail: 'user@test.com' });
  });

  it('returns 403 when ownership fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'other@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    expect((await GET(makeRequest(), makeParams())).status).toBe(403);
  });

  it('Guestway NOT called when ownership fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'other@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    await GET(makeRequest(), makeParams());
    expect(mockGuestway).not.toHaveBeenCalled();
  });

  it('Guestway called after ownership confirmed', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    await GET(makeRequest(), makeParams());
    expect(mockGuestway).toHaveBeenCalledWith('RCMH-TEST');
  });

  it('returns 200 with formatted fields', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('name', 'Studio');
    expect(body).toHaveProperty('guests', 2);
  });
});
