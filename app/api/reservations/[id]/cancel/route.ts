import { NextResponse } from 'next/server';
import { cancelAndRefundReservation } from '@/services/cancelAndRefundReservation';
import { bookingLog } from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await cancelAndRefundReservation(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      cancelled: result.cancelled,
      alreadyHandled: result.alreadyHandled ?? false,
      refund: result.refund,
    });
  } catch (error) {
    // Log only the message string — a raw error object can carry PII from
    // upstream (e.g. Supabase constraint messages echoing row data).
    bookingLog.error('cancel route unhandled exception', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}
