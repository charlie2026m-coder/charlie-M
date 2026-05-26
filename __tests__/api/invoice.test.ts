import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/services/Request', () => ({
  Fetch: vi.fn(),
  getOrRefreshToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('@/services/verifyReservationInProperty', () => ({
  verifyReservationInProperty: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  })),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationInProperty } from '@/services/verifyReservationInProperty';
import { GET as invoiceGET } from '@/app/api/invoice/route';
import { GET as folioGET } from '@/app/api/invoice/folio/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockVerify = vi.mocked(verifyReservationInProperty);

function makeSupabase(user: object | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ ok: true } as never);
});

// ── GET /api/invoice (PDF download) ──────────────────────────────────────────

describe('GET /api/invoice — PDF download (CharlieM)', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=INV-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when invoiceId missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice'));
    expect(res.status).toBe(400);
  });
});

// ── GET /api/invoice/folio — Folio data + invoice list ───────────────────────

describe('GET /api/invoice/folio (CharlieM)', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await folioGET(new NextRequest('http://localhost/api/invoice/folio?folioId=RCMH-ABC-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when folioId missing', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    const res = await folioGET(new NextRequest('http://localhost/api/invoice/folio'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when verifyReservationInProperty fails', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' } as never);
    const res = await folioGET(new NextRequest('http://localhost/api/invoice/folio?folioId=RCMH-XYZ-1'));
    expect(res.status).toBe(404);
  });
});
