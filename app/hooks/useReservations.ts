import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReservationFilter } from '@/store/useProfile';

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

