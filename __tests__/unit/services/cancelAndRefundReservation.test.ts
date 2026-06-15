import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/verifyReservationInProperty', () => ({ verifyReservationInProperty: vi.fn() }));
vi.mock('@/services/apaleo/cancelReservation', () => ({ cancelReservation: vi.fn() }));
vi.mock('@/services/refundReservationPayment', () => ({ refundCapturedReservationPayment: vi.fn() }));
vi.mock('@/services/getReservationFolioPayments', () => ({ getReservationFolioPayments: vi.fn() }));

let currentAdmin: any;
const insertSpy = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => currentAdmin) }));

import { verifyReservationInProperty } from '@/services/verifyReservationInProperty';
import { cancelReservation } from '@/services/apaleo/cancelReservation';
import { refundCapturedReservationPayment } from '@/services/refundReservationPayment';
import { getReservationFolioPayments } from '@/services/getReservationFolioPayments';
import { cancelAndRefundReservation } from '@/services/cancelAndRefundReservation';

const mockVerify = vi.mocked(verifyReservationInProperty);
const mockCancel = vi.mocked(cancelReservation);
const mockRefund = vi.mocked(refundCapturedReservationPayment);
const mockFolio = vi.mocked(getReservationFolioPayments);

const RES = 'RCMH-ABC123';
const ROOM_PSP = 'PSP_ROOM';
const SVC_PSP = 'PSP_SVC';

// Admin client whose bookings lookup returns the given room psp.
function makeAdmin(roomPsp: string | null) {
  return {
    from: (table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            contains: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: roomPsp ? { transaction_reference: roomPsp } : null }),
              }),
            }),
          }),
        };
      }
      // reservation_refunds
      return {
        insert: insertSpy,
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
        delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      };
    },
  };
}

function setReservation(opts: { feeAmount?: number; feeCurrency?: string; status?: string } = {}) {
  mockVerify.mockResolvedValue({
    ok: true,
    reservation: {
      id: RES,
      status: opts.status ?? 'Confirmed',
      totalGrossAmount: { amount: 0, currency: 'EUR' },
      cancellationFee:
        opts.feeAmount !== undefined
          ? { fee: { amount: opts.feeAmount, currency: opts.feeCurrency ?? 'EUR' } }
          : undefined,
    },
  } as any);
}

function setFolio(payments: Array<Record<string, unknown>>, unsettled = 0) {
  mockFolio.mockResolvedValue({ payments, unsettled } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  insertSpy.mockResolvedValue({ error: null });
  mockCancel.mockResolvedValue({ success: true } as any);
  mockRefund.mockImplementation(async (psp: string) => ({
    success: true,
    modificationRef: `MOD-${psp}`,
    status: 'received',
  }));
  currentAdmin = makeAdmin(ROOM_PSP);
  setReservation({ feeAmount: 0 });
  setFolio([]);
});

describe('cancelAndRefundReservation — per-payment refund split', () => {
  it('free cancel: refunds room and services each on its own psp, in full', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 32900, currency: 'EUR', type: 'Authorization', status: 'Success' },
      { pspReference: SVC_PSP, amountCents: 3000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({ ok: true, cancelled: true, refund: { status: 'requested', amountCents: 35900 } });
    expect(mockRefund).toHaveBeenCalledWith(ROOM_PSP, 32900, 'EUR', `${RES}::${ROOM_PSP}`);
    expect(mockRefund).toHaveBeenCalledWith(SVC_PSP, 3000, 'EUR', `${RES}::${SVC_PSP}`);
    expect(mockRefund).toHaveBeenCalledTimes(2);
  });

  it('penalty applies to the ROOM only; services refunded in full', async () => {
    setReservation({ feeAmount: 50 }); // €50 penalty
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 32900, currency: 'EUR', type: 'Authorization', status: 'Success' },
      { pspReference: SVC_PSP, amountCents: 3000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);

    const res = await cancelAndRefundReservation(RES);

    // room: 329.00 - 50.00 = 279.00 ; services untouched
    expect(mockRefund).toHaveBeenCalledWith(ROOM_PSP, 27900, 'EUR', `${RES}::${ROOM_PSP}`);
    expect(mockRefund).toHaveBeenCalledWith(SVC_PSP, 3000, 'EUR', `${RES}::${SVC_PSP}`);
    expect(res).toMatchObject({ refund: { amountCents: 30900, status: 'requested' } });
  });

  it('room-only booking: single refund on the room psp', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 20000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);

    await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith(ROOM_PSP, 20000, 'EUR', `${RES}::${ROOM_PSP}`);
  });

  it('penalty covers the whole room and no services: nothing to refund, status completed', async () => {
    setReservation({ feeAmount: 100 });
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 10000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { amountCents: 0, status: 'completed' } });
  });

  it('no captured card payments (e.g. OTA/bank transfer): manual, no Adyen refund', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, cancelled: true, refund: { status: 'failed', manual: true } });
  });

  it('unknown cancellation fee: cancels but routes refund to manual', async () => {
    setReservation({}); // no cancellationFee
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 20000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('a payment that fails to refund flags the whole cancellation manual', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 20000, currency: 'EUR', type: 'Authorization', status: 'Success' },
      { pspReference: SVC_PSP, amountCents: 3000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);
    mockRefund.mockImplementation(async (psp: string) =>
      psp === SVC_PSP
        ? { success: false, error: 'Adyen rejected' }
        : { success: true, modificationRef: `MOD-${psp}`, status: 'received' },
    );

    const res = await cancelAndRefundReservation(RES);

    // both were attempted; result is manual because one failed
    expect(mockRefund).toHaveBeenCalledTimes(2);
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('already-Canceled reservation: never auto-refunds again, but records a manual-review row (review #3 + #8)', async () => {
    // Cancelled through another path (staff in Apaleo/Adyen dashboard) — the
    // folio still lists the original captures, so refunding here would pay
    // the guest twice. We must NOT refund, but we MUST leave a durable
    // work-list row so ops can check whether a refund is still owed.
    setReservation({ feeAmount: 0, status: 'Canceled' });
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 20000, currency: 'EUR', type: 'Authorization', status: 'Success' },
    ]);

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({
      ok: true,
      cancelled: true,
      alreadyHandled: true,
      refund: { status: 'failed', manual: true },
    });
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
    // A durable manual-review row is written (review #8).
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reservation_id: RES, status: 'failed', amount_cents: 0 }),
    );
  });

  it('already-Canceled with an EXISTING refund row: returns it, writes nothing new', async () => {
    setReservation({ feeAmount: 0, status: 'Canceled' });
    setFolio([]);
    // Admin client whose reservation_refunds lookup finds a prior row.
    currentAdmin = {
      from: (table: string) => {
        if (table === 'reservation_refunds') {
          return {
            insert: insertSpy,
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { amount_cents: 12345, currency: 'EUR', status: 'completed' } }),
              }),
            }),
          };
        }
        return makeAdmin(ROOM_PSP).from(table);
      },
    };

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({
      ok: true,
      alreadyHandled: true,
      refund: { amountCents: 12345, status: 'completed' },
    });
    expect(insertSpy).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('pending (unsettled) folio payments route the refund to manual (review #10)', async () => {
    setReservation({ feeAmount: 0 });
    setFolio(
      [{ pspReference: ROOM_PSP, amountCents: 20000, currency: 'EUR', type: 'Authorization', status: 'Success' }],
      1 // one Pending payment in flight
    );

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('nets folio refunds against captures — an already-refunded psp gets nothing (review #12)', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([
      { pspReference: ROOM_PSP, amountCents: 20000, currency: 'EUR', type: 'Authorization', status: 'Success' },
      { pspReference: SVC_PSP, amountCents: 3000, currency: 'EUR', type: 'Authorization', status: 'Success' },
      { pspReference: SVC_PSP, amountCents: -3000, currency: 'EUR', type: 'Refund', status: 'Success' },
    ]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith(ROOM_PSP, 20000, 'EUR', `${RES}::${ROOM_PSP}`);
    expect(res).toMatchObject({ refund: { amountCents: 20000, status: 'requested' } });
  });

  it('does not cancel/refund when the reservation is not in this property', async () => {
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' } as any);

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({ ok: false, status: 404 });
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });
});
