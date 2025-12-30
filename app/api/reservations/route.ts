import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Fetch } from '@/services/Request';
import { Reservation } from '@/types/apaleo';

// Map filter to Apaleo status
const filterToStatus: Record<string, string> = {
  'All': '',
  'Ongoing': 'InHouse',
  'Upcoming': 'Confirmed',
  'Completed': 'CheckedOut',
  'Cancelled': 'Canceled',
};

interface ApaleoReservationsListResponse {
  reservations: any[];
  count: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const filter = searchParams.get('filter') || 'All';
    const pageSize = 3;

    // Get current user email
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      return NextResponse.json({ count: 0, reservations: [] });
    }

    // Build Apaleo query params
    const apaleoParams = new URLSearchParams({
      textSearch: user.email,
      pageNumber: page.toString(),
      pageSize: pageSize.toString(),
    });

    // Add status filter if not "All"
    if (filter !== 'All' && filterToStatus[filter]) {
      apaleoParams.append('status', filterToStatus[filter]);
    }

    // Get reservations from Apaleo
    const apaleoResponse = await Fetch<ApaleoReservationsListResponse>(
      `/booking/v1/reservations?${apaleoParams.toString()}&expand=services`
    );

    // Handle empty response or 204 No Content
    if (!apaleoResponse || !apaleoResponse.reservations || apaleoResponse.reservations.length === 0) {
      return NextResponse.json({ count: 0, reservations: [] });
    }

    // Get room details from Supabase
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true });

    const roomDetails = roomsData || [];

    // Add room photos to reservations
    const formattedReservations: Reservation[] = apaleoResponse.reservations.map(item => {
      const room = roomDetails.find((r: any) => r.id === item.unitGroup?.id);
      return {
        ...item,
        name: item.unitGroup?.name || '',
        images: room?.photos || [],
        guests: item.adults + (item.childrenAges?.length || 0),
      } as Reservation;
    });

    return NextResponse.json({ 
      count: apaleoResponse.count, 
      reservations: formattedReservations 
    });

  } catch (error) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

