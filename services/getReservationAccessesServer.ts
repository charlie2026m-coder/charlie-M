const API_URL = process.env.NEXT_PUBLIC_GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.NEXT_PUBLIC_GUESTWAY_API_KEY;
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_GUESTWAY_ACCESS_TOKEN;

interface ReservationAccessData {
  reservationId: string;
  confirmationCode: string;
  roomNumber: string | null;
  pinCode: string | null;
  fullPinCode: string | null;
  validFrom: string | null;
  validTo: string | null;
}

/**
 * Server-side function to fetch reservation accesses from Guestway API
 * Can be used in Server Components, Server Actions, and API Routes
 */
export async function getReservationAccessesServer(
  reservationIds: string | string[]
): Promise<ReservationAccessData[]> {
  const ids = Array.isArray(reservationIds) ? reservationIds : [reservationIds];

  if (ids.length === 0 || !API_URL || !PARTNERSHIP_API_KEY || !ACCESS_TOKEN) {
    return [];
  }

  try {
    const filters = [{ field: 'id', operator: 'in', value: ids }];
    const url = `${API_URL}/reservation-accesses?filters=${encodeURIComponent(JSON.stringify(filters))}`;

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': PARTNERSHIP_API_KEY,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch reservation accesses: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Transform Guestway API response to our format
    const accesses: ReservationAccessData[] = data.data?.map((reservation: any) => {
      const firstAccess = reservation.accesses?.[0];
      return {
        reservationId: reservation.id,
        confirmationCode: reservation.confirmationCode,
        roomNumber: firstAccess?.lock?.doorName || firstAccess?.lock?.name || null,
        pinCode: firstAccess?.code?.pinCode || null,
        fullPinCode: firstAccess?.code?.pinCode && firstAccess?.code?.pinCodeSuffix 
          ? `${firstAccess.code.pinCode}${firstAccess.code.pinCodeSuffix}` 
          : firstAccess?.code?.pinCode || null,
        validFrom: firstAccess?.code?.validFrom || null,
        validTo: firstAccess?.code?.validTo || null,
      };
    }) || [];

    return accesses;
  } catch (error) {
    console.error('Error fetching reservation accesses:', error);
    return [];
  }
}
