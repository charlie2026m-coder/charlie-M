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

export function useGuestReservations(reservationId: string) {
  return useQuery({
    queryKey: ['guest-reservations', reservationId],
    queryFn: async () => {
      if (!reservationId) return { count: 0, reservations: [] };

      // Fetch reservation with room details and PIN codes
      const response = await fetch(`/api/reservations/${reservationId}/full`);
      if (!response.ok) throw new Error('Failed to fetch reservation');
      
      const reservation = await response.json();
      return {
        count: 1,
        reservations: [reservation]
      };
    },
    enabled: !!reservationId,
    staleTime: 0,
    refetchOnMount: true,
  });
}
