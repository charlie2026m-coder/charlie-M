import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// ── helpers ───────────────────────────────────────────────────────────────────

function escapeHmac(v: string | number | undefined | null): string {
  return String(v ?? '').replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

function computeHmac(key: string, item: Record<string, any>): string {
  const payload = [
    item.pspReference, item.originalReference || '', item.merchantAccountCode,
    item.merchantReference, item.amount?.value, item.amount?.currency,
    item.eventCode, item.success,
  ].map(escapeHmac).join(':');
  return crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(payload).digest('base64');
}

const baseItem = {
  pspReference: 'PSP-CMH-001', originalReference: '',
  merchantAccountCode: 'ApaleoGmbHCOM',
  merchantReference: 'REF-CMH-001',
  amount: { value: 15000, currency: 'EUR' },
  eventCode: 'AUTHORISATION', success: 'true',
};

function makeBody(overrides: Partial<typeof baseItem> = {}, hmacKey?: string) {
  const item = { ...baseItem, ...overrides };
  const sig = hmacKey ? computeHmac(hmacKey, item) : 'INVALID_SIG';
  return {
    notificationItems: [{
      NotificationRequestItem: { ...item, additionalData: { hmacSignature: sig } },
    }],
  };
}

// ── supabase mock ─────────────────────────────────────────────────────────────

const pendingBookingData = { booking_payload: { reservations: [] }, status: 'pending' };

function makeFromMock(opts: { existingBooking?: object | null } = {}) {
  return vi.fn().mockImplementation((table: string) => {
    if (table === 'bookings') return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: opts.existingBooking ?? null }) }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) }),
    };
    if (table === 'pending_bookings') return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: pendingBookingData }) }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
    };
    if (table === 'pending_services') return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
    };
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
  });
}

let currentFrom = makeFromMock();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: (...args: any[]) => currentFrom(...args) })),
}));

vi.mock('@/services/Request', () => ({
  getOrRefreshToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('@/services/bookReservationServices', () => ({
  bookReservationServices: vi.fn().mockResolvedValue({ services: [], payment: { success: true } }),
}));

vi.mock('@/app/actions/adyen/reversePayment', () => ({
  reversePayment: vi.fn().mockResolvedValue({}),
}));

import { POST } from '@/app/api/webhooks/adyen/route';
import { reversePayment } from '@/app/actions/adyen/reversePayment';

const mockReversePayment = vi.mocked(reversePayment);

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/webhooks/adyen', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentFrom = makeFromMock();
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ id: 'APALEO-CMH-1', reservationIds: [{ id: 'RES-1' }] }),
    text: async () => '',
  });
});

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/webhooks/adyen (CharlieM)', () => {
  it('always returns plaintext [accepted] with status 200', async () => {
    const res = await POST(makeRequest(makeBody()));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('[accepted]');
  });

  it('Content-Type is text/plain', async () => {
    const res = await POST(makeRequest(makeBody()));
    expect(res.headers.get('Content-Type')).toContain('text/plain');
  });

  it('dev mode (no HMAC key): processes notification', async () => {
    await POST(makeRequest(makeBody({ success: 'true' })));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled();
  });

  it('production (no HMAC key): notification skipped', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await POST(makeRequest(makeBody()));
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('success=false → Apaleo NOT called', async () => {
    await POST(makeRequest(makeBody({ success: 'false' })));
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('AUTHORISATION success=true → booking created', async () => {
    await POST(makeRequest(makeBody({ success: 'true' })));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled();
  });

  it('Apaleo failure → reversePayment called', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({}), text: async () => '' });
    await POST(makeRequest(makeBody()));
    expect(mockReversePayment).toHaveBeenCalled();
  });

  it('idempotency: completed booking → no Apaleo call', async () => {
    currentFrom = makeFromMock({ existingBooking: { status: 'completed', apaleo_booking_id: 'EXISTING' } });
    await POST(makeRequest(makeBody()));
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('HMAC escape: colon in merchantReference → \\: in payload', () => {
    const item = { ...baseItem, merchantReference: 'REF:COLON' };
    const payload = [item.pspReference, '', item.merchantAccountCode, item.merchantReference, item.amount.value, item.amount.currency, item.eventCode, item.success].map(escapeHmac).join(':');
    expect(payload).toContain('REF\\:COLON');
  });

  it('HMAC escape: backslash → \\\\ in payload', () => {
    const item = { ...baseItem, merchantReference: 'REF\\BACK' };
    const payload = [item.pspReference, '', item.merchantAccountCode, item.merchantReference, item.amount.value, item.amount.currency, item.eventCode, item.success].map(escapeHmac).join(':');
    expect(payload).toContain('REF\\\\BACK');
  });
});

// ── guest-cancel refund finalization (multi-psp, review findings #1/#2/#4/#10) ─
//
// A small in-memory fake of the two money tables, faithful enough for the
// webhook's query shapes: chained .eq(), terminal .maybeSingle()/await, insert
// with a UNIQUE-constraint check, and update-by-filter. Far closer to real
// behaviour than per-shape vi.fn() stubs, so the tests exercise the actual code.

interface RefundRow {
  reservation_id: string;
  amount_cents: number;
  status: string;
  currency?: string | null;
  note?: string | null;
}
interface ReversalRow {
  psp_reference: string;
  merchant_reference: string | null;
  reservation_id: string | null;
  event_code: string;
  success: boolean;
  amount_cents: number | null;
  currency: string | null;
  needs_action: boolean;
}
interface FakeDb {
  reservation_refunds: RefundRow[];
  payment_reversals: ReversalRow[];
  failReversalInsert?: boolean;
  failReversalDupUpdate?: boolean;
}

function makeFakeFrom(db: FakeDb) {
  const uniqueCol: Record<string, string> = {
    reservation_refunds: 'reservation_id',
    payment_reversals: 'psp_reference',
  };
  return vi.fn().mockImplementation((table: 'reservation_refunds' | 'payment_reversals') => {
    const rows = db[table] as unknown as Array<Record<string, unknown>>;
    const filters: Array<[string, unknown]> = [];
    let op: { type: 'insert'; row: Record<string, unknown> } | { type: 'update'; fields: Record<string, unknown> } | null = null;
    const match = (r: Record<string, unknown>) => filters.every(([c, v]) => r[c] === v);

    const settle = () => {
      if (op?.type === 'insert') {
        if (table === 'payment_reversals' && db.failReversalInsert) {
          return { error: { code: '500', message: 'boom' } };
        }
        const key = uniqueCol[table];
        const row = op.row;
        if (key && rows.some((r) => r[key] === row[key])) {
          return { error: { code: '23505' } };
        }
        rows.push({ ...row });
        return { error: null };
      }
      if (op?.type === 'update') {
        if (table === 'payment_reversals' && db.failReversalDupUpdate) {
          return { error: { code: '500', message: 'dup-update boom' } };
        }
        const hit = rows.filter(match);
        for (const r of hit) Object.assign(r, op.fields);
        return { error: null, data: hit.map((r) => ({ ...r })) };
      }
      return { data: rows.filter(match).map((r) => ({ ...r })), error: null };
    };

    const api: Record<string, unknown> = {
      insert(row: Record<string, unknown>) { op = { type: 'insert', row }; return api; },
      update(fields: Record<string, unknown>) { op = { type: 'update', fields }; return api; },
      select() { return api; },
      eq(col: string, val: unknown) { filters.push([col, val]); return api; },
      maybeSingle() {
        const found = rows.filter(match)[0] ?? null;
        return Promise.resolve({ data: found ? { ...found } : null, error: null });
      },
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        try { resolve(settle()); } catch (e) { reject(e); }
      },
    };
    return api;
  });
}

describe('guest-cancel refund rows: multi-psp completion', () => {
  const RES_ID = 'RCMH-REV1';

  function refundEvent(psp: string, modRef: string, cents: number, ok = true) {
    return makeBody({
      eventCode: ok ? 'REFUND' : 'REFUND_FAILED',
      success: ok ? 'true' : 'false',
      pspReference: modRef,
      merchantReference: `${RES_ID}::${psp}`,
      amount: { value: cents, currency: 'EUR' },
    });
  }
  const refundRow = (db: FakeDb) => db.reservation_refunds.find((r) => r.reservation_id === RES_ID);

  it('the first psp of a multi-psp refund does NOT complete the row; the last one does', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 30900, status: 'requested', currency: 'EUR' }],
      payment_reversals: [],
    };
    currentFrom = makeFakeFrom(db);

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-1', 27900)));
    expect(refundRow(db)?.status).toBe('requested'); // 279.00 of 309.00 settled

    await POST(makeRequest(refundEvent('PSP_SVC', 'MOD-2', 3000)));
    expect(refundRow(db)?.status).toBe('completed'); // every cent settled
  });

  it('a REFUND_FAILED for one psp fails the whole row — a later success cannot flip it back', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 30900, status: 'requested', currency: 'EUR' }],
      payment_reversals: [],
    };
    currentFrom = makeFakeFrom(db);

    await POST(makeRequest(refundEvent('PSP_SVC', 'MOD-1', 3000, false)));
    expect(refundRow(db)?.status).toBe('failed');

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-2', 27900)));
    expect(refundRow(db)?.status).toBe('failed'); // manual follow-up stays
  });

  it('legacy plain reservation-id reference still matches and completes', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 30900, status: 'requested', currency: 'EUR' }],
      payment_reversals: [],
    };
    currentFrom = makeFakeFrom(db);

    await POST(
      makeRequest(makeBody({
        eventCode: 'REFUND', success: 'true', pspReference: 'MOD-LEGACY',
        merchantReference: RES_ID, amount: { value: 30900, currency: 'EUR' },
      }))
    );
    expect(refundRow(db)?.status).toBe('completed');
  });

  it('a REFUND for an unrelated reference touches nothing', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 30900, status: 'requested', currency: 'EUR' }],
      payment_reversals: [],
    };
    currentFrom = makeFakeFrom(db);

    await POST(
      makeRequest(makeBody({
        eventCode: 'REFUND', success: 'true', pspReference: 'MOD-OTHER',
        merchantReference: 'REF-SOMETHING-ELSE', amount: { value: 5000, currency: 'EUR' },
      }))
    );
    expect(refundRow(db)?.status).toBe('requested');
    expect(db.payment_reversals).toHaveLength(1);
    expect(db.payment_reversals[0].reservation_id).toBeNull();
  });

  // ── #1: a transient reversal-insert failure must not strand the row ──────────
  it('completes via in-memory amount when the payment_reversals insert fails (#1)', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 20000, status: 'requested', currency: 'EUR' }],
      payment_reversals: [],
      failReversalInsert: true, // the durable write throws/errors transiently
    };
    currentFrom = makeFakeFrom(db);

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-1', 20000)));

    // The audit row didn't persist, but the single full refund still completes
    // (its amount is counted in-memory) instead of hanging in 'requested'.
    expect(refundRow(db)?.status).toBe('completed');
    expect(db.payment_reversals).toHaveLength(0);
  });

  // ── #2: a bank-reversed refund flips a completed row back to failed ─────────
  it('REFUNDED_REVERSED flips an already-completed refund to failed (#2)', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 20000, status: 'completed', currency: 'EUR' }],
      payment_reversals: [
        { psp_reference: 'MOD-1', merchant_reference: `${RES_ID}::PSP_ROOM`, reservation_id: RES_ID,
          event_code: 'REFUND', success: true, amount_cents: 20000, currency: 'EUR', needs_action: false },
      ],
    };
    currentFrom = makeFakeFrom(db);

    await POST(
      makeRequest(makeBody({
        eventCode: 'REFUNDED_REVERSED', success: 'false', pspReference: 'MOD-1',
        merchantReference: `${RES_ID}::PSP_ROOM`, amount: { value: 20000, currency: 'EUR' },
      }))
    );

    const row = refundRow(db);
    expect(row?.status).toBe('failed');
    expect(row?.note).toContain('reversed by bank');
  });

  it('REFUNDED_REVERSED recovers the reservation from the prior psp row when its ref does not echo ours (#2)', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 20000, status: 'completed', currency: 'EUR' }],
      payment_reversals: [
        { psp_reference: 'MOD-9', merchant_reference: `${RES_ID}::PSP_ROOM`, reservation_id: RES_ID,
          event_code: 'REFUND', success: true, amount_cents: 20000, currency: 'EUR', needs_action: false },
      ],
    };
    currentFrom = makeFakeFrom(db);

    await POST(
      makeRequest(makeBody({
        eventCode: 'REFUNDED_REVERSED', success: 'false', pspReference: 'MOD-9',
        merchantReference: 'OPAQUE-ADYEN-REF', amount: { value: 20000, currency: 'EUR' },
      }))
    );
    expect(refundRow(db)?.status).toBe('failed');
  });

  // ── #10: only OUR refunds, in the row's currency, count toward completion ────
  it('an unrelated same-reservation REFUND row (wrong reference) does not count (#10)', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 30900, status: 'requested', currency: 'EUR' }],
      payment_reversals: [
        // A refund linked to the reservation but NOT our `${id}::psp` format
        // (e.g. an out-of-band entry) must be ignored by the completion sum.
        { psp_reference: 'MOD-X', merchant_reference: 'manual-goodwill', reservation_id: RES_ID,
          event_code: 'REFUND', success: true, amount_cents: 30000, currency: 'EUR', needs_action: false },
      ],
    };
    currentFrom = makeFakeFrom(db);

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-1', 100)));
    // Only our 100 counts (not 30000 + 100), so the plan is far from settled.
    expect(refundRow(db)?.status).toBe('requested');
  });

  it('a settled REFUND in a different currency does not count (#10)', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 20000, status: 'requested', currency: 'EUR' }],
      payment_reversals: [],
    };
    currentFrom = makeFakeFrom(db);

    await POST(
      makeRequest(makeBody({
        eventCode: 'REFUND', success: 'true', pspReference: 'MOD-USD',
        merchantReference: `${RES_ID}::PSP_ROOM`, amount: { value: 20000, currency: 'USD' },
      }))
    );
    // Wrong-currency refund is recorded but excluded from the EUR plan's sum.
    expect(refundRow(db)?.status).toBe('requested');
  });

  // ── review-fix regressions surfaced by the verification workflow ────────────

  it('redelivered REFUND whose dup-update fails is counted ONCE, not double (#1 fix)', async () => {
    // The partial REFUND already persisted; Adyen redelivers it (23505) and the
    // volatile-field refresh transiently fails. The event must not be summed
    // from the table AND again in-memory — that would wrongly complete the row.
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 30900, status: 'requested', currency: 'EUR' }],
      payment_reversals: [
        { psp_reference: 'MOD-ROOM', merchant_reference: `${RES_ID}::PSP_ROOM`, reservation_id: RES_ID,
          event_code: 'REFUND', success: true, amount_cents: 27900, currency: 'EUR', needs_action: false },
      ],
      failReversalDupUpdate: true,
    };
    currentFrom = makeFakeFrom(db);

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-ROOM', 27900)));
    // 27900 counted once (from the table) < 30900 → still waiting, NOT completed.
    expect(refundRow(db)?.status).toBe('requested');
  });

  it('REFUND_FAILED does NOT clobber an already-completed refund (#2a fix)', async () => {
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 20000, status: 'completed', currency: 'EUR' }],
      payment_reversals: [],
    };
    currentFrom = makeFakeFrom(db);

    await POST(makeRequest(refundEvent('PSP_OLD', 'MOD-OLD', 20000, false))); // REFUND_FAILED
    expect(refundRow(db)?.status).toBe('completed'); // guard keeps it completed
  });

  it('REFUNDED_REVERSED recovers the reservation via originalReference (#2b fix)', async () => {
    // Realistic reversal: a fresh pspReference, opaque merchantReference, linked
    // to the original refund only by originalReference.
    const db: FakeDb = {
      reservation_refunds: [{ reservation_id: RES_ID, amount_cents: 20000, status: 'completed', currency: 'EUR' }],
      payment_reversals: [
        { psp_reference: 'MOD-REFUND', merchant_reference: `${RES_ID}::PSP_ROOM`, reservation_id: RES_ID,
          event_code: 'REFUND', success: true, amount_cents: 20000, currency: 'EUR', needs_action: false },
      ],
    };
    currentFrom = makeFakeFrom(db);

    await POST(
      makeRequest(makeBody({
        eventCode: 'REFUNDED_REVERSED', success: 'false',
        pspReference: 'MOD-REVERSED-NEW', originalReference: 'MOD-REFUND',
        merchantReference: 'OPAQUE-ADYEN-REF', amount: { value: 20000, currency: 'EUR' },
      }))
    );
    expect(refundRow(db)?.status).toBe('failed');
  });
});
