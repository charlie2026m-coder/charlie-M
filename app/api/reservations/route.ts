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

    // Get ALL reservations from Apaleo (without pagination for sorting)
    const allReservationsParams = new URLSearchParams({
      textSearch: user.email,
      pageSize: '100', // Get more results for proper sorting
      sort: 'created:desc', // Sort by creation date, newest first
    });

    // Add status filter if not "All"
    if (filter !== 'All' && filterToStatus[filter]) {
      allReservationsParams.append('status', filterToStatus[filter]);
    }

    const apaleoResponse = await Fetch<ApaleoReservationsListResponse>(
      `/booking/v1/reservations?${allReservationsParams.toString()}&expand=services`
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
        guests: item.adults, // Only count adults as guests
      } as Reservation;
    });

    // Apaleo already sorted by created:desc, just apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedReservations = formattedReservations.slice(startIndex, endIndex);

    console.log(`📄 Page ${page}: returning reservations ${startIndex + 1}-${Math.min(endIndex, formattedReservations.length)} of ${formattedReservations.length}`);

    return NextResponse.json({ 
      count: formattedReservations.length, // Total count
      reservations: paginatedReservations 
    });

  } catch (error) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

