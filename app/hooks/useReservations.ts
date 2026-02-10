import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReservationFilter } from '@/store/useProfile';
import { supabase } from '@/lib/supabase';

export function useReservations(page: number, filter: ReservationFilter = 'All') {
  return useQuery({
    queryKey: ['reservations', page, filter],
    queryFn: async () => {
      const response = await fetch(`/api/reservations?page=${page}&filter=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch reservations');

      return response.json();
    },
    staleTime: 0, // Always fetch fresh data when filter/page changes
    refetchOnMount: true, // Always refetch when component mounts
  });
}


export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) =>{
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {  method: 'POST' });
      if (!response.ok) throw new Error('Failed to cancel reservation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useDeleteReservationService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, serviceId }: { reservationId: string; serviceId: string }) => {
      const response = await fetch(`/api/services?reservationId=${reservationId}&serviceId=${serviceId}`, { 
        method: 'DELETE' 
      });
      if (!response.ok) throw new Error('Failed to delete service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useAddedReservations() {
  return useQuery({
    queryKey: ['added-reservations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return []

      const { data: reservationIds } = await supabase
        .from('reservations')
        .select('reservation_id')
        .eq('user_id', user.id)

      if (!reservationIds || reservationIds.length === 0) return []

      const promises = reservationIds.map(({ reservation_id }) => {
        return fetch(`/api/reservations/${reservation_id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(err => {
            console.error(`❌ ${reservation_id}: ${err.message}`)
            return null
          })
      })

      const results = await Promise.all(promises)
      return results.filter(r => r !== null)
    },
  });
}

export function useGuestReservations(guestData: { type: 'reservation' | 'booking', data: any } | null) {
  return useQuery({
    queryKey: ['guest-reservations', guestData?.data?.id],
    queryFn: async () => {
      if (!guestData) return { count: 0, reservations: [] };

      // Use cached data from sessionStorage/store
      const { type, data } = guestData;

      if (type === 'reservation') {
        // Single reservation - need to fetch with services expanded
        const response = await fetch(`/api/reservations/${data.id}`);
        if (!response.ok) throw new Error('Failed to fetch reservation');
        
        const reservation = await response.json();
        return {
          count: 1,
          reservations: [reservation]
        };
      } else if (type === 'booking') {
        // Booking with multiple reservations - fetch each with services
        const reservationIds = data.reservations?.map((r: any) => r.id) || [];
        
        const promises = reservationIds.map((id: string) => 
          fetch(`/api/reservations/${id}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        );
        
        const reservations = await Promise.all(promises);
        const validReservations = reservations.filter(r => r !== null);
        
        return {
          count: validReservations.length,
          reservations: validReservations
        };
      }

      return { count: 0, reservations: [] };
    },
    enabled: !!guestData,
    staleTime: 0,
    refetchOnMount: true,
  });
}
