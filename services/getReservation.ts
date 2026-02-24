import { Fetch } from './Request';
import { getRoomsDetails } from './getRoomsDetails';
import { ApaleoReservationResponse, Reservation } from '@/types/apaleo';
import { getReservationAccessesServer } from './getReservationAccessesServer';

// Get single reservation by ID with formatted details
export async function getReservationById(reservationId: string): Promise<Reservation | null> {
  try {
    const [reservationResult, roomDetailsResult, accessDataResult] = await Promise.allSettled([
      Fetch<ApaleoReservationResponse>(`/booking/v1/reservations/${reservationId}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=services&expand=booker`),
      getRoomsDetails(),
      getReservationAccessesServer(reservationId)
    ]);

    // Handle reservation result (required)
    if (reservationResult.status === 'rejected') {
      console.error(`Failed to fetch reservation from Apaleo ${reservationId}:`, reservationResult.reason);
      return null;
    }

    const reservation = reservationResult.value;
    if (!reservation) {
      return null;
    }

    // Handle room details result (optional - fallback to empty array)
    let roomDetails: Awaited<ReturnType<typeof getRoomsDetails>> = [];
    if (roomDetailsResult.status === 'fulfilled') {
      roomDetails = roomDetailsResult.value || [];
    } else {
      console.error(`Failed to fetch room details from Supabase for reservation ${reservationId}:`, roomDetailsResult.reason);
    }

    const room = roomDetails.find(room => room.id === reservation.unitGroup?.id);

    // Handle access data result (optional - fallback to null)
    let accesses = null;
    if (accessDataResult.status === 'fulfilled') {
      const accessDataList = accessDataResult.value || [];
      accesses = accessDataList[0] || null;
    } else {
      console.error(`Failed to fetch access data from Guestway for reservation ${reservationId}:`, accessDataResult.reason);
    }

    // Format reservation with room details and access data
    return {
      ...reservation,
      name: reservation.unitGroup?.name || '',
      image: room?.photos?.[0] || '',
      images: room?.photos || [],
      attributes: room?.attributes || [],
      size: room?.size || 0,
      guests: reservation.adults + (reservation.childrenAges?.length || 0),
      accesses,
    } as Reservation;
  } catch (error: any) {
    console.error(`Unexpected error fetching reservation ${reservationId}:`, error.message);
    return null;
  }
}

