import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/Request', () => ({ Fetch: vi.fn() }));

import { Fetch } from '@/services/Request';
import { getReservationFolioPayments } from '@/services/getReservationFolioPayments';

const mockFetch = vi.mocked(Fetch);

let payIdSeq = 0;
function pay(psp: string, amount: number, type = 'Card', status = 'Success', id?: string) {
  return {
    id: id ?? `pay-${++payIdSeq}`,
    amount: { amount, currency: 'EUR' },
    type,
    status,
    externalReference: { pspReference: psp },
  };
}

/** Wire folio list + per-folio payments. */
function wire(folios: Record<string, unknown[]>) {
  mockFetch.mockImplementation(async (endpoint: string) => {
    if (endpoint.startsWith('/finance/v1/folios?')) {
      return { folios: Object.keys(folios).map((id) => ({ id })) };
    }
    const m = endpoint.match(/\/finance\/v1\/folios\/([^/]+)\/payments/);
    if (m) return { payments: folios[decodeURIComponent(m[1])] ?? [] };
    throw new Error(`unexpected endpoint: ${endpoint}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getReservationFolioPayments', () => {
  it('collects successful captures with their psp', async () => {
    wire({ F1: [pay('PSP_ROOM', 150), pay('PSP_SVC', 30)] });
    const { payments, unsettled } = await getReservationFolioPayments('R-1');
    expect(payments).toEqual([
      expect.objectContaining({ pspReference: 'PSP_ROOM', amountCents: 15000 }),
      expect.objectContaining({ pspReference: 'PSP_SVC', amountCents: 3000 }),
    ]);
    expect(unsettled).toBe(0);
  });

  it('emits refunds/reversals as NEGATIVE so the psp net shrinks (#12)', async () => {
    wire({ F1: [pay('PSP_ROOM', 150), pay('PSP_ROOM', 50, 'Refund')] });
    const { payments } = await getReservationFolioPayments('R-1');
    expect(payments.map((p) => p.amountCents)).toEqual([15000, -5000]);
  });

  it('treats negative amounts as outflows regardless of type', async () => {
    wire({ F1: [pay('PSP_ROOM', -25, 'Other')] });
    const { payments } = await getReservationFolioPayments('R-1');
    expect(payments[0].amountCents).toBe(-2500);
  });

  it('counts Pending inflows as unsettled instead of dropping them silently (#10)', async () => {
    wire({ F1: [pay('PSP_ROOM', 150), pay('PSP_LATE', 30, 'Card', 'Pending')] });
    const { payments, unsettled } = await getReservationFolioPayments('R-1');
    expect(payments).toHaveLength(1);
    expect(unsettled).toBe(1);
  });

  it('skips Failure rows silently — no money moved, no manual flag', async () => {
    wire({ F1: [pay('PSP_ROOM', 150), pay('PSP_DEAD', 30, 'Card', 'Failure')] });
    const { payments, unsettled } = await getReservationFolioPayments('R-1');
    expect(payments).toHaveLength(1);
    expect(unsettled).toBe(0);
  });

  it('skips a row with a DUPLICATE payment id (true double-listing)', async () => {
    // Same Apaleo payment row delivered twice → one of them is dropped.
    wire({ F1: [pay('PSP_ROOM', 150, 'Card', 'Success', 'dup-id'), pay('PSP_ROOM', 150, 'Card', 'Success', 'dup-id')] });
    const { payments } = await getReservationFolioPayments('R-1');
    expect(payments).toHaveLength(1);
  });

  it('KEEPS two genuinely distinct equal movements on one psp (#9 — different ids)', async () => {
    // Two equal partial captures on the same psp are real money, not a
    // double-listing — both must count (a psp|amount|type key wrongly merged them).
    wire({ F1: [pay('PSP_ROOM', 100, 'Card', 'Success', 'cap-a'), pay('PSP_ROOM', 100, 'Card', 'Success', 'cap-b')] });
    const { payments } = await getReservationFolioPayments('R-1');
    expect(payments).toHaveLength(2);
    expect(payments.map((p) => p.amountCents)).toEqual([10000, 10000]);
  });

  it('keeps the same psp across DIFFERENT folios (legitimate split)', async () => {
    wire({ F1: [pay('PSP_ROOM', 150)], F2: [pay('PSP_ROOM', 150)] });
    const { payments } = await getReservationFolioPayments('R-1');
    expect(payments).toHaveLength(2);
  });

  it('ignores rows without a psp or with a zero amount', async () => {
    wire({
      F1: [
        { amount: { amount: 99, currency: 'EUR' }, type: 'Cash', status: 'Success' },
        pay('PSP_ZERO', 0),
      ],
    });
    const { payments } = await getReservationFolioPayments('R-1');
    expect(payments).toHaveLength(0);
  });
});
