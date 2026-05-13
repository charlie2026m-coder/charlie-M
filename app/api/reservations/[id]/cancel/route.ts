import { NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await Fetch(`/booking/v1/reservation-actions/${id}/cancel`, {method: 'PUT' }) ;
    console.log(response, 'cancel response');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}

