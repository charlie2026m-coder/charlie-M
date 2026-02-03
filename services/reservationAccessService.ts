interface ReservationAccess {
  reservationId: string;
  confirmationCode: string;
  roomNumber: string | null;
  pinCode: string | null;
  fullPinCode: string | null;
  validFrom: string | null;
  validTo: string | null;
}

interface ReservationAccessesResponse {
  accesses: ReservationAccess[];
  totalCount: number;
}

export async function getReservationAccesses(
  reservationIds: string | string[]
): Promise<ReservationAccessesResponse> {
  try {
    const ids = Array.isArray(reservationIds) ? reservationIds : [reservationIds];

    if (ids.length === 0) {
      return { accesses: [], totalCount: 0 };
    }

    const response = await fetch('/api/reservation-accesses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reservationIds: ids }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch reservation accesses');
    }

    const data: ReservationAccessesResponse = await response.json();
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching reservation accesses:', error);
    throw error;
  }
}
