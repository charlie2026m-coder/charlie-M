import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/verifyReservationOwnership', () => ({
  verifyReservationOwnership: vi.fn(),
}));

vi.mock('@/services/Request', () => ({
  getOrRefreshToken: vi.fn().mockResolvedValue('mock-token'),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { PATCH } from '@/app/api/reservations/[id]/booker-address/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockVerify = vi.mocked(verifyReservationOwnership);

function makeSupabase(user: object | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } } as any;
}

const updatedGuestData = {
  firstName: 'John', lastName: 'Doe', email: 'john@test.com',
  phone: '+49123', address: { addressLine1: 'Street 1', city: 'Berlin', countryCode: 'DE' },
};

function makeRequest(id = 'RCMH-TEST') {
  return new Request(`http://localhost/api/reservations/${id}/booker-address`, {
    method: 'PATCH',
    body: JSON.stringify({ updatedGuestData }),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeParams(id = 'RCMH-TEST') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ ok: true });
  // Mock Apaleo PATCH calls
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' });
});

describe('PATCH /api/reservations/[id]/booker-address (CharlieM only)', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await PATCH(makeRequest() as any, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 when verifyOwnership fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    const res = await PATCH(makeRequest() as any, makeParams());
    expect(res.status).toBe(403);
  });

  it('does NOT call Apaleo when ownership fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    await PATCH(makeRequest() as any, makeParams());
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('returns 200 and calls Apaleo when ownership ok', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    const res = await PATCH(makeRequest() as any, makeParams());
    expect(res.status).toBe(200);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled();
  });

  it('returns 502 when the folio debitor PATCH fails — no fake success (review #13)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL) => {
      if (String(url).includes('/finance/v1/folios/')) {
        return { ok: false, status: 422, text: async () => 'debitor rejected' };
      }
      return { ok: true, status: 204, text: async () => '' };
    });
    const res = await PATCH(makeRequest() as any, makeParams());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBeUndefined();
  });

  it('returns 404 when verifyOwnership returns not-found', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' });
    const res = await PATCH(makeRequest() as any, makeParams());
    expect(res.status).toBe(404);
  });

  it('patches both reservation and folio in parallel', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    await PATCH(makeRequest() as any, makeParams());
    // Two PATCH calls: one to reservations, one to folios
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });
});
