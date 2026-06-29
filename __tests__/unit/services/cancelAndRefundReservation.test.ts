import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/verifyReservationInProperty', () => ({ verifyReservationInProperty: vi.fn() }));
vi.mock('@/services/apaleo/cancelReservation', () => ({ cancelReservation: vi.fn() }));
vi.mock('@/services/apaleo/refundFolioPayment', () => ({
  refundFolioPayment: vi.fn(),
  getFolioRefundsByPayment: vi.fn(),
}));
vi.mock('@/services/getReservationFolioPayments', () => ({ getReservationFolioPayments: vi.fn() }));

let currentAdmin: any;
const insertSpy = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => currentAdmin) }));

import { verifyReservationInProperty } from '@/services/verifyReservationInProperty';
import { cancelReservation } from '@/services/apaleo/cancelReservation';
import { refundFolioPayment, getFolioRefundsByPayment } from '@/services/apaleo/refundFolioPayment';
import { getReservationFolioPayments } from '@/services/getReservationFolioPayments';
import { cancelAndRefundReservation } from '@/services/cancelAndRefundReservation';

const mockVerify = vi.mocked(verifyReservationInProperty);
const mockCancel = vi.mocked(cancelReservation);
const mockRefund = vi.mocked(refundFolioPayment);
const mockRefundsByPayment = vi.mocked(getFolioRefundsByPayment);
const mockFolio = vi.mocked(getReservationFolioPayments);

const RES = 'RCMH-ABC123';
const ROOM_PSP = 'PSP_ROOM';
const SVC_PSP = 'PSP_SVC';
const FOLIO = 'FOL-1';
const PID_ROOM = 'PID_ROOM';
const PID_SVC = 'PID_SVC';

// A folio capture row in the shape getReservationFolioPayments now returns
// (with folioId + paymentId, which the refund path requires).
function cap(
  pspReference: string,
  amountCents: number,
  paymentId: string | null,
  extra: Record<string, unknown> = {},
) {
  return {
    pspReference,
    amountCents,
    currency: 'EUR',
    type: 'Authorization',
    status: 'Success',
    folioId: FOLIO,
    paymentId,
    ...extra,
  };
}

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

function setReservation(
  opts: { feeAmount?: number; feeCurrency?: string; status?: string; dueDateTime?: string } = {},
) {
  mockVerify.mockResolvedValue({
    ok: true,
    reservation: {
      id: RES,
      status: opts.status ?? 'Confirmed',
      totalGrossAmount: { amount: 0, currency: 'EUR' },
      cancellationFee:
        opts.feeAmount !== undefined
          ? {
              fee: { amount: opts.feeAmount, currency: opts.feeCurrency ?? 'EUR' },
              ...(opts.dueDateTime ? { dueDateTime: opts.dueDateTime } : {}),
            }
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
  // Apaleo accepts each refund and returns a refund id (Pending → settles async).
  mockRefund.mockImplementation(async ({ paymentId }: any) => ({
    success: true,
    refundId: `REF-${paymentId}`,
    status: 'Pending',
  }));
  // No prior refunds on the folio by default.
  mockRefundsByPayment.mockResolvedValue(new Map());
  currentAdmin = makeAdmin(ROOM_PSP);
  setReservation({ feeAmount: 0 });
  setFolio([]);
});

describe('cancelAndRefundReservation — refund-through-Apaleo per payment', () => {
  it('free cancel: refunds room and services each on its own folio payment, in full', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 32900, PID_ROOM), cap(SVC_PSP, 3000, PID_SVC)]);

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({ ok: true, cancelled: true, refund: { status: 'requested', amountCents: 35900 } });
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 32900, currency: 'EUR' });
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_SVC, amountCents: 3000, currency: 'EUR' });
    expect(mockRefund).toHaveBeenCalledTimes(2);
  });

  it('penalty applies to the ROOM only; services refunded in full', async () => {
    setReservation({ feeAmount: 50 }); // €50 penalty (no dueDateTime → applies)
    setFolio([cap(ROOM_PSP, 32900, PID_ROOM), cap(SVC_PSP, 3000, PID_SVC)]);

    const res = await cancelAndRefundReservation(RES);

    // room: 329.00 - 50.00 = 279.00 ; services untouched
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 27900, currency: 'EUR' });
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_SVC, amountCents: 3000, currency: 'EUR' });
    expect(res).toMatchObject({ refund: { amountCents: 30900, status: 'requested' } });
  });

  it('within the free-cancellation window (dueDateTime in the future) refunds in FULL despite a non-zero fee', async () => {
    // The Apaleo fee.amount is non-zero before the deadline; the actual owed fee
    // is 0 until dueDateTime. Guest must get a full refund (ported €0 bug fix).
    setReservation({ feeAmount: 50, dueDateTime: '2099-01-01T00:00:00Z' });
    setFolio([cap(ROOM_PSP, 32900, PID_ROOM)]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 32900, currency: 'EUR' });
    expect(res).toMatchObject({ refund: { amountCents: 32900, status: 'requested' } });
  });

  it('after the deadline (dueDateTime in the past) the penalty applies', async () => {
    setReservation({ feeAmount: 50, dueDateTime: '2000-01-01T00:00:00Z' });
    setFolio([cap(ROOM_PSP, 32900, PID_ROOM)]);

    await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 27900, currency: 'EUR' });
  });

  it('room-only booking: single refund on the room payment', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM)]);

    await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 20000, currency: 'EUR' });
  });

  it('penalty covers the whole room and no services: nothing to refund, status completed', async () => {
    setReservation({ feeAmount: 100 });
    setFolio([cap(ROOM_PSP, 10000, PID_ROOM)]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { amountCents: 0, status: 'completed' } });
  });

  it('no captured card payments (e.g. OTA/bank transfer): manual, no refund', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, cancelled: true, refund: { status: 'failed', manual: true } });
  });

  it('unknown cancellation fee: cancels but routes refund to manual', async () => {
    setReservation({}); // no cancellationFee
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM)]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('a capture without a payment id cannot be refunded → manual (not coverable)', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, null)]); // id-less capture

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('a payment that fails to refund flags the whole cancellation manual', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM), cap(SVC_PSP, 3000, PID_SVC)]);
    mockRefund.mockImplementation(async ({ paymentId }: any) =>
      paymentId === PID_SVC
        ? { success: false, error: 'Apaleo rejected' }
        : { success: true, refundId: `REF-${paymentId}`, status: 'Pending' },
    );

    const res = await cancelAndRefundReservation(RES);

    // both were attempted; result is manual because one failed
    expect(mockRefund).toHaveBeenCalledTimes(2);
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('already-Canceled reservation: never auto-refunds again, but records a manual-review row', async () => {
    setReservation({ feeAmount: 0, status: 'Canceled' });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM)]);

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({
      ok: true,
      cancelled: true,
      alreadyHandled: true,
      refund: { status: 'failed', manual: true },
    });
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reservation_id: RES, status: 'failed', amount_cents: 0 }),
    );
  });

  it('already-Canceled with an EXISTING refund row: returns it, writes nothing new', async () => {
    setReservation({ feeAmount: 0, status: 'Canceled' });
    setFolio([]);
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

  it('pending (unsettled) folio payments route the refund to manual', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM)], 1); // one Pending payment in flight

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('caps each refund at the payment REMAINING balance — an already-refunded psp gets nothing', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM), cap(SVC_PSP, 3000, PID_SVC)]);
    // The services payment was already fully refunded on the folio.
    mockRefundsByPayment.mockResolvedValue(new Map([[PID_SVC, 3000]]));

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 20000, currency: 'EUR' });
    expect(res).toMatchObject({ refund: { amountCents: 20000, status: 'requested' } });
  });

  it('refunds only the REMAINING after a prior partial refund on the room', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM)]);
    mockRefundsByPayment.mockResolvedValue(new Map([[PID_ROOM, 8000]])); // €80 already refunded

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith({ folioId: FOLIO, paymentId: PID_ROOM, amountCents: 12000, currency: 'EUR' });
    expect(res).toMatchObject({ refund: { amountCents: 12000, status: 'requested' } });
  });

  it('unreadable existing folio refunds → manual (never guess against real money)', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM)]);
    mockRefundsByPayment.mockRejectedValue(new Error('Apaleo 500'));

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('a negative (reversal/chargeback) line on the folio routes to manual', async () => {
    setReservation({ feeAmount: 0 });
    setFolio([cap(ROOM_PSP, 20000, PID_ROOM), cap(ROOM_PSP, -5000, 'PID_REV', { type: 'Reversal' })]);

    const res = await cancelAndRefundReservation(RES);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(res).toMatchObject({ refund: { status: 'failed', manual: true } });
  });

  it('does not cancel/refund when the reservation is not in this property', async () => {
    mockVerify.mockResolvedValue({ ok: false, status: 404, error: 'Reservation not found' } as any);

    const res = await cancelAndRefundReservation(RES);

    expect(res).toMatchObject({ ok: false, status: 404 });
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });
});
