import { ReservationAccessData } from '@/types/apaleo';

const API_URL = process.env.GUESTWAY_API_URL;
const PARTNERSHIP_API_KEY = process.env.GUESTWAY_API_KEY;
const ACCESS_TOKEN = process.env.GUESTWAY_ACCESS_TOKEN;

// Guestway API response interfaces
interface GuestwayCode {
  id: string;
  pinCode: string;
  pinCodeSuffix: string;
  isFallbackCode: boolean;
  isDisabled: boolean;
  validFrom: string;
  validTo: string;
}

interface GuestwayLock {
  id: string;
  name: string;
  doorName: string;
}

interface GuestwayAccess {
  lock: GuestwayLock;
  code: GuestwayCode | null;
}

interface GuestwayReservation {
  id: string;
  organizationId: string;
  checkIn: string;
  checkOut: string;
  confirmationCode: string;
  channelExternalCode: string | null;
  accesses: GuestwayAccess[];
}

interface GuestwayApiResponse {
  data: GuestwayReservation[];
  meta: {
    count: number;
    cursor: string | null;
  };
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
    // For single ID, use 'eq' operator; for multiple IDs, use 'in'
    const filters = ids.length === 1 
      ? [{ field: 'confirmationCode', operator: 'eq', value: ids[0] }]
      : [{ field: 'confirmationCode', operator: 'in', value: ids }];
    
    const url = `${API_URL}/reservation-accesses?filters=${encodeURIComponent(JSON.stringify(filters))}`;

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': PARTNERSHIP_API_KEY,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Guestway] Failed to fetch reservation accesses: ${response.status}`);
      console.error(`❌ [Guestway] Error response:`, errorText);
      return [];
    }

    const data: GuestwayApiResponse = await response.json();
    console.log('✅ [Guestway] Full response data:', JSON.stringify(data, null, 2));
    
    // Check if data is empty
    if (!data.data || data.data.length === 0) {
      console.warn('⚠️ [Guestway] No access data found for confirmation codes:', ids);
      return [];
    }
    
    // Transform Guestway API response to our format
    const accesses: ReservationAccessData[] = data.data.map((reservation: GuestwayReservation) => {
      // Find access where doorName contains "room door" and name is a number
      const roomDoorAccess = reservation.accesses.find((access) => {
        const doorName = access.lock?.doorName?.toLowerCase() || '';
        const name = access.lock?.name || '';
        const hasRoomDoor = doorName.includes('room door');
        const isNameNumber = /^\d+$/.test(name);
        return hasRoomDoor && isNameNumber;
      });
      
      // Use room door access if found, otherwise fallback to first access
      const selectedAccess = roomDoorAccess || reservation.accesses[0];
      
      return {
        reservationId: reservation.confirmationCode,
        roomNumber: selectedAccess?.lock?.name || selectedAccess?.lock?.doorName || null,
        pinCode: selectedAccess?.code?.pinCode || null,
      };
    });

    return accesses;
  } catch (error) {
    console.error('Error fetching reservation accesses:', error);
    return [];
  }
}
