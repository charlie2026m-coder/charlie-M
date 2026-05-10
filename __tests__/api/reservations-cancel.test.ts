import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/services/Request', () => ({
  Fetch: vi.fn(),
}));

vi.mock('@/lib/verifyReservationOwnership', () => ({
  verifyReservationOwnership: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Fetch } from '@/services/Request';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { POST } from '@/app/api/reservations/[id]/cancel/route';

const mockFetch = vi.mocked(Fetch);
const mockVerify = vi.mocked(verifyReservationOwnership);
const mockCreateClient = vi.mocked(createSupabaseServerClient);

function makeSupabase(user: object | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as any;
}

function makeRequest(id = 'RMOT-ABC123') {
  return new Request(`http://localhost/api/reservations/${id}/cancel`, { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({} as any);
});

describe('POST /api/reservations/[id]/cancel', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RMOT-ABC123' }) });
    expect(res.status).toBe(401);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('returns 200 and calls Fetch cancel when ownership ok (DB fast path)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RMOT-ABC123' }) });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('RMOT-ABC123'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('returns 403 and does NOT call cancel Fetch when ownership fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RMOT-ABC123' }) });
    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 404 when verifyReservationOwnership returns not-found', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' });
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RMOT-MISSING' }) });
    expect(res.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('cancel Fetch called with PUT method on correct Apaleo endpoint', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: true });
    await POST(makeRequest('RMOT-TESTID') as any, { params: Promise.resolve({ id: 'RMOT-TESTID' }) });
    expect(mockFetch).toHaveBeenCalledWith(
      '/booking/v1/reservation-actions/RMOT-TESTID/cancel',
      { method: 'PUT' }
    );
  });

  it('returns 200 JSON with {success: true} on successful cancel', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RMOT-ABC123' }) });
    expect(await res.json()).toEqual({ success: true });
  });
});
