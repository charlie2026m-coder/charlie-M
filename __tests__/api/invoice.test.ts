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

// Admin client used by the folio route to resolve invoice_states.
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
import { Fetch } from '@/services/Request';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { GET as invoiceGET } from '@/app/api/invoice/route';
import { GET as folioGET } from '@/app/api/invoice/folio/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockFetch = vi.mocked(Fetch);
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
  // Guard compares the invoice's Apaleo property against this env var.
  process.env.APALEO_PROPERTY_ID = 'CMH';
});

// ── GET /api/invoice (PDF download) ──────────────────────────────────────────
// Ownership is resolved via Apaleo (invoice → folioId → reservationId), NOT via
// invoice_states, so staff-issued Correction invoices (which have no
// invoice_states row) are still downloadable by the owner.

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

  it('returns 404 when the invoice is unknown to Apaleo', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    mockFetch.mockRejectedValue(new Error('404 not found'));
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=INV-OTHER'));
    expect(res.status).toBe(404);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('returns 404 when the invoice belongs to a different Apaleo property', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1' }));
    mockFetch.mockResolvedValue({ folioId: 'MOT-1-1', propertyId: 'MOT' } as never);
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=INV-OTHERPROP'));
    expect(res.status).toBe(404);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('returns 403 (IDOR blocked) when the invoice resolves to a reservation the user does not own', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'attacker' }));
    mockFetch.mockResolvedValue({ folioId: 'CMH-VICTIM-1', propertyId: 'CMH' } as never);
    mockVerify.mockResolvedValue({ ok: false, status: 403, error: 'Not owned' } as never);
    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=INV-VICTIM'));
    expect(res.status).toBe(403);
    // folioId `CMH-VICTIM-1` → strip the folio suffix → reservation `CMH-VICTIM`.
    expect(mockVerify).toHaveBeenCalledWith(expect.anything(), { id: 'attacker' }, 'CMH-VICTIM');
  });

  it('streams a Correction invoice with NO invoice_states row (ownership via Apaleo folio)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'owner' }));
    // A correction PDF has its own invoiceId but shares the reservation's folio.
    mockFetch.mockResolvedValue({ folioId: 'CMH-RES-1', propertyId: 'CMH' } as never);
    mockVerify.mockResolvedValue({ ok: true } as never);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['%PDF-1.4']),
      text: async () => '',
    }) as unknown as typeof fetch;

    const res = await invoiceGET(new NextRequest('http://localhost/api/invoice?invoiceId=CMH-CORRECTION-99'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(mockVerify).toHaveBeenCalledWith(expect.anything(), { id: 'owner' }, 'CMH-RES');
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
