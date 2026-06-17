import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/services/Request', () => ({
  Fetch: vi.fn(),
  getOrRefreshToken: vi.fn().mockResolvedValue('mock-token'),
}));

// The routes now enforce real ownership (email match OR reservations DB link),
// not mere knowledge of the id. Mock the helper the routes actually call.
vi.mock('@/lib/verifyReservationOwnership', () => ({
  verifyReservationOwnership: vi.fn().mockResolvedValue({ ok: true }),
}));

// Admin client used to resolve invoice_states (invoice_id -> reservation_id).
// `invoiceStateRow` is mutable so each test can simulate "row found" / "no row".
let invoiceStateRow: { data: unknown; error: unknown } = { data: null, error: null };
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn(() => Promise.resolve(invoiceStateRow)),
          single: vi.fn(() => Promise.resolve(invoiceStateRow)),
        }),
      }),
    }),
  })),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { GET as invoiceGET } from '@/app/api/invoice/route';
import { GET as folioGET } from '@/app/api/invoice/folio/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockVerify = vi.mocked(verifyReservationOwnership);

function makeSupabase(user: object | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  invoiceStateRow = { data: null, error: null };
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

  it('returns 404 for an invoiceId with no invoice_states row (unknown / not app-created)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    invoiceStateRow = { data: null, error: null };
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=INV-OTHER'));
    expect(res.status).toBe(404);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('returns 403 (IDOR blocked) when the invoice resolves to a reservation the user does not own', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'attacker' }));
    invoiceStateRow = { data: { reservation_id: 'RCMH-VICTIM' }, error: null };
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Not owned' } as never);
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=INV-VICTIM'));
    expect(res.status).toBe(403);
    expect(mockVerify).toHaveBeenCalledWith(expect.anything(), { id: 'attacker' }, 'RCMH-VICTIM');
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

  it('returns 403 (IDOR blocked) when the user does not own the reservation', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'attacker' }));
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Not owned' } as never);
    const res = await folioGET(new NextRequest('http://localhost/api/invoice/folio?folioId=RCMH-VICTIM-1'));
    expect(res.status).toBe(403);
    // folioId `${reservationId}-1` resolves to the reservation id before the check.
    expect(mockVerify).toHaveBeenCalledWith(expect.anything(), { id: 'attacker' }, 'RCMH-VICTIM');
  });
});
