import { NextRequest, NextResponse } from 'next/server';
import { beds24Request } from '../auth';
import type { Beds24PropertiesResponse, Beds24RoomsResponse, Beds24AvailabilityResponse } from '@/types/beds24';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const adults = searchParams.get('adults') || '1';
    const children = searchParams.get('children') || '0';

    console.log('API params:', { from, to, adults, children });
    let rooms;

      const res = await beds24Request<Beds24PropertiesResponse>('/properties?includeAllRooms=true', 'GET');
      const availabilityResponse = await beds24Request<Beds24AvailabilityResponse>(`/inventory/rooms/availability?startDate=${from}&endDate=${to}`, 'GET'); 
      const availability = availabilityResponse?.data ?? [];  
      const properties = res?.data ?? [];
      const data: Beds24RoomsResponse[] = properties.flatMap((property) => property.roomTypes ?? []).map(item =>{
        return {
          ...item,
          availability: availability.find(availability => availability.roomId === item.id)?.availability,
        }
      });

      rooms = data.map((room) => ({
        id: room?.id,
        features: room?.featureCodes?.flat(),
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
        units: room?.units,
        availability: room?.availability,
      }));

    return NextResponse.json(rooms);
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rooms',
    }, { status: 500 });
  }
}