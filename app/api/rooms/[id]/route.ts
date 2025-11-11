import { NextResponse } from 'next/server';
import { beds24Request } from '../../auth';
import type { Beds24PropertiesResponse, Beds24RoomType } from '@/types/beds24';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const details = await beds24Request(
      `/properties?includeAllRooms=true&roomId=${id}`, 
      'GET'
    );
    console.log(details?.data?.[0], 'details')
    const room = details?.data?.[0]?.roomTypes?.[0];
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