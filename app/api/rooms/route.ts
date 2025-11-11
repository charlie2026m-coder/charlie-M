import { NextResponse } from 'next/server';
import { beds24Request } from '../auth';
import type { Beds24PropertiesResponse, Beds24RoomsResponse } from '@/types/beds24';

export async function GET() {
  try {
    const res = await beds24Request<Beds24PropertiesResponse>('/properties?includeAllRooms=true', 'GET');

    const properties = res?.data ?? [];
    const data: Beds24RoomsResponse[] = properties.flatMap((property) => property.roomTypes ?? []);

    const rooms = data.map((room) => ({
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
    }))

  

    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rooms',
    }, { status: 500 });
  }
}