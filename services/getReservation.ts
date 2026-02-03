import { Fetch } from './Request';
import { getRoomsDetails } from './getRoomsDetails';
import { ApaleoReservationResponse, Reservation } from '@/types/apaleo';
import { getReservationAccessesServer } from './getReservationAccessesServer';

// Get single reservation by ID with formatted details
export async function getReservationById(reservationId: string): Promise<Reservation | null> {
  try {
    // Get reservation details from Apaleo
    const reservation = await Fetch<ApaleoReservationResponse>(`/booking/v1/reservations/${reservationId}?expand=services&expand=booker`);
    
    if (!reservation) return null;

    // Get room details from Supabase
    const roomDetails = await getRoomsDetails();
    const room = roomDetails.find(room => room.id === reservation.unitGroup?.id);

    // Get access data from Guestway using server service
    let accesses = null;
    const accessDataList = await getReservationAccessesServer(reservationId);
    accesses = accessDataList[0] || null;
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
    console.error(`Failed to fetch reservation ${reservationId}:`, error.message);
    return null;
  }
}

