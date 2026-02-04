import { useQuery } from '@tanstack/react-query';
import { getReservationAccesses } from '@/services/reservationAccessService';

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

export function useReservationAccesses(
  reservationIds: string | string[],
  enabled: boolean = true
) {
  const ids = Array.isArray(reservationIds) ? reservationIds : [reservationIds];
  
  return useQuery<ReservationAccessesResponse, Error>({
    queryKey: ['reservation-accesses', ids],
    queryFn: () => getReservationAccesses(ids),
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
