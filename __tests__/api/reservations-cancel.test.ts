import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/verifyReservationOwnership', () => ({
  verifyReservationOwnership: vi.fn(),
}));

// CharlieM cancels AND refunds via this service (unlike Motz19's bare cancel).
vi.mock('@/services/cancelAndRefundReservation', () => ({
  cancelAndRefundReservation: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { cancelAndRefundReservation } from '@/services/cancelAndRefundReservation';
import { POST } from '@/app/api/reservations/[id]/cancel/route';

const mockCancel = vi.mocked(cancelAndRefundReservation);
const mockVerify = vi.mocked(verifyReservationOwnership);
const mockCreateClient = vi.mocked(createSupabaseServerClient);

function makeSupabase(user: object | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as any;
}

function makeRequest(id = 'RCMH-ABC123') {
  return new Request(`http://localhost/api/reservations/${id}/cancel`, { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCancel.mockResolvedValue({ ok: true, cancelled: true, refund: { status: 'requested' } } as any);
});

describe('POST /api/reservations/[id]/cancel', () => {
  it('returns 401 when no session and does not verify or cancel', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RCMH-ABC123' }) });
    expect(res.status).toBe(401);
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('returns 200 and cancels when ownership ok', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RCMH-ABC123' }) });
    expect(res.status).toBe(200);
    expect(mockCancel).toHaveBeenCalledWith('RCMH-ABC123');
    expect(await res.json()).toMatchObject({ success: true });
  });

  it('returns 403 and does NOT cancel when ownership fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RCMH-ABC123' }) });
    expect(res.status).toBe(403);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('returns 404 when ownership returns not-found', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' });
    const res = await POST(makeRequest('RCMH-MISSING') as any, { params: Promise.resolve({ id: 'RCMH-MISSING' }) });
    expect(res.status).toBe(404);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('propagates a service failure status (e.g. 409 already handled)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'u@test.com' }));
    mockVerify.mockResolvedValue({ ok: true });
    mockCancel.mockResolvedValue({ ok: false, status: 409, error: 'Already cancelled' } as any);
    const res = await POST(makeRequest() as any, { params: Promise.resolve({ id: 'RCMH-ABC123' }) });
    expect(res.status).toBe(409);
  });
});
