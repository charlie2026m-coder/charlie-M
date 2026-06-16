import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Fetch } from '@/services/Request';
import { Reservation } from '@/types/apaleo';
import { getReservationAccessesServer } from '@/services/getReservationAccessesServer';

const PAGE_SIZE = 3;

// Map filter to Apaleo status
const filterToStatus: Record<string, string> = {
  'All': '',
  'Ongoing': 'InHouse',
  'Upcoming': 'Confirmed',
  'Completed': 'CheckedOut',
  'Canceled': 'Canceled',
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
    // Client-side search needs all of a guest's own reservations in one go.
    // Default to the paged size; cap so we never pull an unbounded list.
    const requestedPageSize = Number(searchParams.get('pageSize'));
    const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 50)
      : PAGE_SIZE;

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
      sort: 'created:desc',
    });

    if (filter !== 'All' && filterToStatus[filter]) {
      apaleoParams.append('status', filterToStatus[filter]);
    }

    const apaleoResponse = await Fetch<ApaleoReservationsListResponse>(`/booking/v1/reservations?${apaleoParams.toString()}&propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=services`);

    const totalCount = apaleoResponse?.count ?? 0;
    const reservations = apaleoResponse?.reservations ?? [];

    if (reservations.length === 0) {
      return NextResponse.json({ count: totalCount, reservations: [] });
    }

    // Get room details from Supabase
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true });

    const roomDetails = roomsData || [];

    // Add room photos to reservations
    let formattedReservations: Reservation[] = reservations.map(item => {
      const room = roomDetails.find((r: any) => r.id === item.unitGroup?.id);
      return {
        ...item,
        name: item.unitGroup?.name || '',
        images: room?.photos || [],
        guests: item.adults, 
      } as Reservation;
    });

    const reservationIds = formattedReservations.map(r => r.id);
    if (reservationIds.length > 0) {
      const accessDataList = await getReservationAccessesServer(reservationIds);
      console.log('🔑 Reservation Accesses:', accessDataList);

      formattedReservations = formattedReservations.map(reservation => {
        const accessInfo = accessDataList.find(item => item.confirmationCode === reservation.id);
        return {
          ...reservation,
          accesses: accessInfo || null
        };
      });
    }

    return NextResponse.json({ 
      count: totalCount,
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

