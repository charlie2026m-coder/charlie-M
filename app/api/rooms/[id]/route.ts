import { NextRequest, NextResponse } from 'next/server';
import { beds24Request } from '../../auth';
import type { Beds24AvailabilityResponse, Beds24PropertiesResponse, Beds24RoomType } from '@/types/beds24';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const adults = searchParams.get('adults') || '1';
    const children = searchParams.get('children') || '0';

    const details = await beds24Request(`/properties?includeAllRooms=true&roomId=${id}`, 'GET');
    const room = details?.data?.[0]?.roomTypes?.[0];
    
    const availabilityResponse = await beds24Request<Beds24AvailabilityResponse>(`/inventory/rooms/availability?roomId=${id}&startDate=${from}&endDate=${to}&numAdults=${adults}&numChildren=${children}`, 'GET');
    const availability = availabilityResponse?.data[0]?.availability ?? undefined; 
    
    const data = {
      id: room?.id,
      features: room?.featureCodes.flat(),
      maxAdult: room?.maxAdult,
      maxChildren: room?.maxChildren,
      maxPeople: room?.maxPeople,
      maxStay: room?.maxStay,
      minPrice: room?.minPrice,
      minStay: room?.minStay,
      name: room?.name,
      propertyId: room?.propertyId,
      qty: room?.qty,
      roomSize: room?.roomSize,
      roomType: room?.roomType,
      unit: room?.unit,
      availability: availability,
    }  
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch room',
    }, { status: 500 });
  }
}