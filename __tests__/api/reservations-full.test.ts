import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/verifyReservationOwnership', () => ({
  verifyReservationOwnership: vi.fn(),
}));

vi.mock('@/services/getReservation', () => ({
  getReservationById: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { getReservationById } from '@/services/getReservation';
import { GET } from '@/app/api/reservations/[id]/full/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockVerify = vi.mocked(verifyReservationOwnership);
const mockGetById = vi.mocked(getReservationById);

const fakeReservation = {
  id: 'RMOT-FULL', booker: { email: 'user@test.com' },
  property: { id: 'MOT' }, adults: 1,
};

function makeSupabase(user: object | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as any;
}

function makeRequest(id = 'RMOT-FULL', locale = 'en') {
  return new NextRequest(`http://localhost/api/reservations/${id}/full?locale=${locale}`);
}

function makeParams(id = 'RMOT-FULL') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ ok: true });
  mockGetById.mockResolvedValue(fakeReservation as any);
});

describe('GET /api/reservations/[id]/full', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 when ownership check fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'other@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it('getReservationById NOT called when ownership fails (Guestway protected)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'other@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    await GET(makeRequest(), makeParams());
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('returns 404 when getReservationById returns null', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    mockGetById.mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 200 with full reservation on success', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('RMOT-FULL');
  });

  it('calls getReservationById after ownership confirmed', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    await GET(makeRequest(), makeParams());
    // CharlieM getReservationById doesn't take locale (1 arg only)
    expect(mockGetById).toHaveBeenCalledWith('RMOT-FULL');
  });

  it('getReservationById called AFTER ownership is confirmed', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    const callOrder: string[] = [];
    mockVerify.mockImplementation(async () => {
      callOrder.push('verify');
      return { ok: true };
    });
    mockGetById.mockImplementation(async () => {
      callOrder.push('getById');
      return fakeReservation as any;
    });
    await GET(makeRequest(), makeParams());
    expect(callOrder).toEqual(['verify', 'getById']);
  });

  it('returns 404 when Apaleo throws (catch block)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    mockGetById.mockRejectedValue(new Error('404 not found'));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 404 when ownership returns not-found', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });
});
