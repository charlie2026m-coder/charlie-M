import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ApaleoReservationResponse } from '@/types/apaleo';

interface AddReservationResponse {
  success: boolean;
  reservation?: ApaleoReservationResponse;
  error?: string;
}

export function useAddReservation() {
  const queryClient = useQueryClient();

  return useMutation<AddReservationResponse, Error, { reservationId: string }>({
    mutationFn: async (params: { reservationId: string }) => {
      const { reservationId } = params;

      if (!reservationId.trim()) {
        throw new Error('Reservation ID is required');
      }

      const response = await fetch(`/api/reservations/search-reservation?reservationId=${encodeURIComponent(reservationId)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to fetch reservation';

        if (response.status === 404) {
          throw new Error('BOOKING_ID_INVALID');
        } else if (response.status === 409 && errorMessage === 'already_added') {
          throw new Error('ALREADY_ADDED');
        } else if (response.status >= 500) {
          throw new Error('SERVER_ERROR');
        }

        throw new Error(errorMessage);
      }

      const reservation: ApaleoReservationResponse & { emailBelongsToUser?: boolean } = await response.json();

      if (!reservation || !reservation.id) {
        throw new Error('Reservation not found');
      }

      // If reservation email matches user's email, inform the user
      if (reservation.emailBelongsToUser) {
        throw new Error('EMAIL_BELONGS_TO_USER');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Insert reservation into Supabase
      const email = reservation.primaryGuest?.email || '';
      const reservationLastName = reservation.primaryGuest?.lastName || '';

      const { error: insertError } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          reservation_id: reservation.id,
          booking_id: reservation.bookingId || '',
          last_name: reservationLastName,
          email: email,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('ALREADY_ADDED');
        }
        throw new Error(`Failed to save reservation: ${insertError.message}`);
      }

      return {
        success: true,
        reservation,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['added-reservations'] });
    },
  });
}
