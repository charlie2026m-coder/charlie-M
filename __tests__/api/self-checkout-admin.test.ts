import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Keep the pure QR helpers real; only the Apaleo-touching sync is mocked.
vi.mock('@/services/selfCheckout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/selfCheckout')>();
  return { ...actual, generateTokens: vi.fn() };
});

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateTokens } from '@/services/selfCheckout';
import { POST as generatePOST } from '@/app/api/admin/self-checkout/generate/route';
import { GET as listGET } from '@/app/api/admin/self-checkout/list/route';
import { GET as logGET } from '@/app/api/admin/self-checkout/log/route';
import { GET as qrGET } from '@/app/api/admin/self-checkout/qr/[token]/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockGenerate = vi.mocked(generateTokens);

interface SessionOpts {
  user?: { id: string; email: string } | null;
  admin?: boolean;
  tokens?: Record<string, unknown>[];
  tokenRow?: Record<string, unknown> | null;
  logs?: Record<string, unknown>[];
}

function makeSessionClient(opts: SessionOpts) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null } }) },
    from: vi.fn((table: string) => {
      if (table === 'admins') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: opts.admin ? { role: 'super_admin' } : null }),
            }),
          }),
        };
      }
      if (table === 'self_checkout_tokens') {
        return {
          select: () => ({
            order: async () => ({ data: opts.tokens ?? [], error: null }),
            eq: () => ({ maybeSingle: async () => ({ data: opts.tokenRow ?? null }) }),
          }),
        };
      }
      if (table === 'self_checkout_log') {
        return {
          select: () => ({
            order: () => ({ limit: async () => ({ data: opts.logs ?? [], error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  } as never;
}

const ADMIN = { user: { id: 'u1', email: 'charlie2026m@gmail.com' }, admin: true };

function qrRequest(token: string, query = '') {
  return new NextRequest(`http://localhost/api/admin/self-checkout/qr/${token}${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerate.mockResolvedValue({ ok: true, units: 125, created: 0 });
});

describe('requireAdmin gate on admin routes', () => {
  it('401 without a session, and the sync never runs', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient({ user: null }));
    const res = await generatePOST();
    expect(res.status).toBe(401);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('403 for an authenticated non-admin (incl. anonymous guests)', async () => {
    mockCreateClient.mockResolvedValue(
      makeSessionClient({ user: { id: 'u2', email: 'guest@test.com' }, admin: false })
    );
    const res = await generatePOST();
    expect(res.status).toBe(403);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/self-checkout/generate', () => {
  it('passes the sync result through for an admin', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient(ADMIN));
    const res = await generatePOST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, units: 125, created: 0 });
  });

  it('500 with ok:false when the sync throws', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient(ADMIN));
    mockGenerate.mockRejectedValue(new Error('Apaleo down'));
    const res = await generatePOST();
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false });
  });
});

describe('GET /api/admin/self-checkout/list', () => {
  it('returns tokens with guest URLs', async () => {
    mockCreateClient.mockResolvedValue(
      makeSessionClient({
        ...ADMIN,
        tokens: [
          { token: 'abc123', unit_id: 'U1', unit_name: 'Room 1', created_at: '2026-06-12T00:00:00Z' },
        ],
      })
    );
    const res = await listGET(new NextRequest('http://localhost/api/admin/self-checkout/list'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].url).toMatch(/\/checkout\/abc123$/);
  });
});

describe('GET /api/admin/self-checkout/log', () => {
  it('returns log entries for an admin', async () => {
    mockCreateClient.mockResolvedValue(
      makeSessionClient({
        ...ADMIN,
        logs: [{ at: '2026-06-12T08:00:00Z', token: 'abc', result: 'ok' }],
      })
    );
    const res = await logGET(new NextRequest('http://localhost/api/admin/self-checkout/log?limit=50'));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(1);
  });
});

describe('GET /api/admin/self-checkout/qr/[token]', () => {
  const tokenRow = { token: 'abc123', unit_name: 'Room 1' };

  it('rejects invalid parameters with 400', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient({ ...ADMIN, tokenRow }));
    const res = await qrGET(qrRequest('abc123', '?fmt=gif'), {
      params: Promise.resolve({ token: 'abc123' }),
    });
    expect(res.status).toBe(400);
  });

  it('404 for an unknown token', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient({ ...ADMIN, tokenRow: null }));
    const res = await qrGET(qrRequest('ghost'), { params: Promise.resolve({ token: 'ghost' }) });
    expect(res.status).toBe(404);
  });

  it('serves an immutable SVG', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient({ ...ADMIN, tokenRow }));
    const res = await qrGET(qrRequest('abc123', '?fmt=svg&color=A09060&logo=1'), {
      params: Promise.resolve({ token: 'abc123' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(await res.text()).toContain('<svg');
  });

  it('forces a named download with download=1', async () => {
    mockCreateClient.mockResolvedValue(makeSessionClient({ ...ADMIN, tokenRow }));
    const res = await qrGET(qrRequest('abc123', '?fmt=png&download=1'), {
      params: Promise.resolve({ token: 'abc123' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="QR_Room_1.png"');
  });
});
