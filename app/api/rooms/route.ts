import { NextResponse } from 'next/server';
import { beds24Request } from '../auth';
import type { Beds24PropertiesResponse, Beds24RoomType } from '@/types/beds24';

export async function GET() {
  try {
    const data = await beds24Request<Beds24PropertiesResponse>('/properties?includeAllRooms=true', 'GET');

    const properties = data?.data ?? [];
    const rooms: Beds24RoomType[] = properties.flatMap((property) => property.roomTypes ?? []);

    return NextResponse.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rooms',
    }, { status: 500 });
  }
}