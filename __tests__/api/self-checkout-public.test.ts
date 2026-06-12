import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));

// Service-role client used inside services/selfCheckout for token lookup +
// audit log. Backed by the in-memory maps below.
const tokenRows = new Map<string, Record<string, unknown>>();
const logInserts: Record<string, unknown>[] = [];

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'self_checkout_tokens') {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: async () => ({ data: tokenRows.get(value) ?? null, error: null }),
            }),
          }),
        };
      }
      if (table === 'self_checkout_log') {
        return {
          insert: async (entry: Record<string, unknown>) => {
            logInserts.push(entry);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  })),
}));

import { Fetch } from '@/services/Request';
import { GET, POST } from '@/app/api/public/self-checkout/[token]/route';

const mockFetch = vi.mocked(Fetch);
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

let ipCounter = 0;

function makeRequest(token: string, opts: { method?: string; earlyAck?: boolean; ip?: string } = {}) {
  const url = `http://localhost/api/public/self-checkout/${token}${opts.earlyAck ? '?early_ack=1' : ''}`;
  return new NextRequest(url, {
    method: opts.method || 'GET',
    headers: { 'x-forwarded-for': opts.ip || `10.1.0.${++ipCounter}` },
  });
}

function params(token: string) {
  return { params: Promise.resolve({ token }) };
}

/** Wire the Apaleo mock: list → head, single fetch → full, PUT → checkout. */
function wireApaleo(opts: {
  head?: Record<string, unknown> | null;
  full?: Record<string, unknown>;
  checkoutError?: Error;
}) {
  mockFetch.mockImplementation(async (endpoint: string, options?: { method?: string }) => {
    if (options?.method === 'PUT') {
      if (opts.checkoutError) throw opts.checkoutError;
      return {};
    }
    if (endpoint.includes('/booking/v1/reservations?')) {
      return { reservations: opts.head ? [opts.head] : [] };
    }
    if (endpoint.includes('/booking/v1/reservations/')) {
      return opts.full ?? {};
    }
    throw new Error(`unexpected endpoint: ${endpoint}`);
  });
}

function inHouse(departureIso: string) {
  return {
    head: {
      id: 'R1',
      status: 'InHouse',
      departure: `${departureIso}T11:00:00+02:00`,
      unit: { id: 'U7' },
    },
    full: {
      id: 'R1',
      status: 'InHouse',
      departure: `${departureIso}T11:00:00+02:00`,
      unit: { id: 'U7' },
      primaryGuest: { firstName: 'Max', lastName: 'Mustermann' },
      balance: { amount: 0, currency: 'EUR' },
      channelCode: 'Direct',
      property: { id: 'CMH' },
    },
  };
}

function plusDays(days: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenRows.clear();
  logInserts.length = 0;
  tokenRows.set('tok-room-7', {
    token: 'tok-room-7',
    property_id: 'CMH',
    unit_id: 'U7',
    unit_name: 'Room 7',
  });
});

describe('GET /api/public/self-checkout/[token] (lookup)', () => {
  it('demo token: ready today, never touches Apaleo', async () => {
    const res = await GET(makeRequest('demo'), params('demo'));
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, state: 'ready', demo: true, days_until: 0, early: false });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('demo-early token: early flow, departure in 4 days', async () => {
    const res = await GET(makeRequest('demo-early'), params('demo-early'));
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, state: 'ready', demo: true, days_until: 4, early: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('unknown token → invalid', async () => {
    const res = await GET(makeRequest('nope'), params('nope'));
    expect(await res.json()).toMatchObject({ ok: false, state: 'invalid' });
  });

  it('InHouse departing today → ready with room and reservation', async () => {
    wireApaleo(inHouse(TODAY));
    const res = await GET(makeRequest('tok-room-7'), params('tok-room-7'));
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      state: 'ready',
      room: 'Room 7',
      reservation_id: 'R1',
      guest: 'Max Mustermann',
      days_until: 0,
      early: false,
    });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('no InHouse reservation → no_departure', async () => {
    wireApaleo({ head: null });
    const res = await GET(makeRequest('tok-room-7'), params('tok-room-7'));
    expect(await res.json()).toMatchObject({ ok: true, state: 'no_departure', room: 'Room 7' });
  });

  it('Apaleo failure → error state, not a 500', async () => {
    mockFetch.mockRejectedValue(new Error('Apaleo API error: 503 - {}'));
    const res = await GET(makeRequest('tok-room-7'), params('tok-room-7'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: false, state: 'error' });
  });
});

describe('POST /api/public/self-checkout/[token] (confirm)', () => {
  it('demo: done without Apaleo call and without log entry', async () => {
    const res = await POST(makeRequest('demo', { method: 'POST' }), params('demo'));
    expect(await res.json()).toMatchObject({ ok: true, state: 'done', demo: true });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logInserts).toHaveLength(0);
  });

  it('checks out on departure day and logs ok', async () => {
    wireApaleo(inHouse(TODAY));
    const res = await POST(makeRequest('tok-room-7', { method: 'POST' }), params('tok-room-7'));
    expect(await res.json()).toMatchObject({ ok: true, state: 'done', room: 'Room 7' });
    const putCalls = mockFetch.mock.calls.filter(([, o]) => o?.method === 'PUT');
    expect(putCalls).toHaveLength(1);
    expect(String(putCalls[0][0])).toContain('/reservation-actions/R1/checkout');
    expect(logInserts).toHaveLength(1);
    expect(logInserts[0]).toMatchObject({ token: 'tok-room-7', result: 'ok' });
  });

  it('EARLY GUARD: without early_ack returns needs_confirm and does NOT check out', async () => {
    wireApaleo(inHouse(plusDays(3)));
    const res = await POST(makeRequest('tok-room-7', { method: 'POST' }), params('tok-room-7'));
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, state: 'needs_confirm', days_until: 3 });
    expect(mockFetch.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
    expect(logInserts[0]).toMatchObject({ result: 'needs_confirm' });
  });

  it('EARLY GUARD: with early_ack=1 the checkout goes through', async () => {
    wireApaleo(inHouse(plusDays(3)));
    const res = await POST(
      makeRequest('tok-room-7', { method: 'POST', earlyAck: true }),
      params('tok-room-7')
    );
    expect(await res.json()).toMatchObject({ ok: true, state: 'done' });
    expect(mockFetch.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(1);
    expect(logInserts[0]).toMatchObject({ result: 'ok' });
  });

  it('race: status flipped after lookup → blocked:not_inhouse, no checkout call', async () => {
    const data = inHouse(TODAY);
    wireApaleo({ head: data.head, full: { ...data.full, status: 'CheckedOut' } });
    const res = await POST(makeRequest('tok-room-7', { method: 'POST' }), params('tok-room-7'));
    expect(await res.json()).toMatchObject({ ok: false, state: 'blocked', reason: 'not_inhouse' });
    expect(mockFetch.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
    expect(logInserts[0]).toMatchObject({ result: 'blocked:not_inhouse' });
  });

  it('maps a failed checkout PUT to error:{status} in the log', async () => {
    wireApaleo({ ...inHouse(TODAY), checkoutError: new Error('Apaleo API error: 422 - {"detail":"x"}') });
    const res = await POST(makeRequest('tok-room-7', { method: 'POST' }), params('tok-room-7'));
    expect(await res.json()).toMatchObject({ ok: false, state: 'error' });
    expect(logInserts[0]).toMatchObject({ result: 'error:422' });
  });

  it('maps a network failure to error:network', async () => {
    wireApaleo({ ...inHouse(TODAY), checkoutError: new TypeError('fetch failed') });
    const res = await POST(makeRequest('tok-room-7', { method: 'POST' }), params('tok-room-7'));
    expect(await res.json()).toMatchObject({ ok: false, state: 'error' });
    expect(logInserts[0]).toMatchObject({ result: 'error:network' });
  });

  it('unknown token → invalid message without state (HotelCheck parity)', async () => {
    const res = await POST(makeRequest('ghost', { method: 'POST' }), params('ghost'));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.state).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('limits per ip:token and keeps other tokens usable from the same IP', async () => {
    const ip = '10.99.0.1';
    wireApaleo({ head: null });
    for (let i = 0; i < 10; i++) {
      const res = await GET(makeRequest('tok-room-7', { ip }), params('tok-room-7'));
      expect(res.status).toBe(200);
    }
    const blocked = await GET(makeRequest('tok-room-7', { ip }), params('tok-room-7'));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ ok: false, state: 'error' });

    // Same IP, different token (NAT case: many rooms behind one hotel Wi-Fi IP)
    const other = await GET(makeRequest('demo', { ip }), params('demo'));
    expect(other.status).toBe(200);
  });
});
