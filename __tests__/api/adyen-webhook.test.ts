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

// ── guest-cancel refund finalization (multi-psp, review finding #4) ───────────

interface RefundState {
  refundRow: { reservation_id: string; amount_cents: number; status: string } | null;
  reversals: Array<{
    reservation_id: string | null;
    event_code: string;
    success: boolean;
    amount_cents: number | null;
  }>;
}

function makeRefundFromMock(state: RefundState) {
  return vi.fn().mockImplementation((table: string) => {
    if (table === 'reservation_refunds') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, val: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data:
                state.refundRow && state.refundRow.reservation_id === val
                  ? { ...state.refundRow }
                  : null,
            }),
          })),
        }),
        update: vi.fn().mockImplementation((fields: Record<string, unknown>) => ({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(async () => {
              // mirrors `.eq('status','requested')` CAS semantics
              if (state.refundRow && state.refundRow.status === 'requested') {
                Object.assign(state.refundRow, fields);
              }
              return { error: null };
            }),
          }),
        })),
      };
    }
    if (table === 'payment_reversals') {
      return {
        insert: vi.fn().mockImplementation(async (row: RefundState['reversals'][number]) => {
          state.reversals.push(row);
          return { error: null };
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_c: string, resId: string) => ({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(async () => ({
                data: state.reversals
                  .filter((r) => r.reservation_id === resId && r.event_code === 'REFUND' && r.success)
                  .map((r) => ({ amount_cents: r.amount_cents })),
              })),
            }),
          })),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    };
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

  it('the first psp of a multi-psp refund does NOT complete the row; the last one does', async () => {
    const state: RefundState = {
      refundRow: { reservation_id: RES_ID, amount_cents: 30900, status: 'requested' },
      reversals: [],
    };
    currentFrom = makeRefundFromMock(state);

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-1', 27900)));
    expect(state.refundRow?.status).toBe('requested'); // 279.00 of 309.00 settled

    await POST(makeRequest(refundEvent('PSP_SVC', 'MOD-2', 3000)));
    expect(state.refundRow?.status).toBe('completed'); // every cent settled
  });

  it('a REFUND_FAILED for one psp fails the whole row — a later success cannot flip it back', async () => {
    const state: RefundState = {
      refundRow: { reservation_id: RES_ID, amount_cents: 30900, status: 'requested' },
      reversals: [],
    };
    currentFrom = makeRefundFromMock(state);

    await POST(makeRequest(refundEvent('PSP_SVC', 'MOD-1', 3000, false)));
    expect(state.refundRow?.status).toBe('failed');

    await POST(makeRequest(refundEvent('PSP_ROOM', 'MOD-2', 27900)));
    expect(state.refundRow?.status).toBe('failed'); // manual follow-up stays
  });

  it('legacy plain reservation-id reference still matches and completes', async () => {
    const state: RefundState = {
      refundRow: { reservation_id: RES_ID, amount_cents: 30900, status: 'requested' },
      reversals: [],
    };
    currentFrom = makeRefundFromMock(state);

    await POST(
      makeRequest(
        makeBody({
          eventCode: 'REFUND',
          success: 'true',
          pspReference: 'MOD-LEGACY',
          merchantReference: RES_ID,
          amount: { value: 30900, currency: 'EUR' },
        })
      )
    );
    expect(state.refundRow?.status).toBe('completed');
  });

  it('a REFUND for an unrelated reference touches nothing', async () => {
    const state: RefundState = {
      refundRow: { reservation_id: RES_ID, amount_cents: 30900, status: 'requested' },
      reversals: [],
    };
    currentFrom = makeRefundFromMock(state);

    await POST(
      makeRequest(
        makeBody({
          eventCode: 'REFUND',
          success: 'true',
          pspReference: 'MOD-OTHER',
          merchantReference: 'REF-SOMETHING-ELSE',
          amount: { value: 5000, currency: 'EUR' },
        })
      )
    );
    expect(state.refundRow?.status).toBe('requested');
    // The reversal itself is still durably recorded, just unlinked.
    expect(state.reversals).toHaveLength(1);
    expect(state.reversals[0].reservation_id).toBeNull();
  });
});
