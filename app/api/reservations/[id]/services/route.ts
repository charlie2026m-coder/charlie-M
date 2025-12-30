import { NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }
    
    const response = await Fetch(`/booking/v1/reservations/${id}/services?serviceId=${serviceId}`, {
      method: 'DELETE',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete service' },
      { status: 500 }
    );
  }
}

