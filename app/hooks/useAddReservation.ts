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

  return useMutation<AddReservationResponse, Error, { reservationId: string, lastName: string }>({
    mutationFn: async (params: { reservationId: string, lastName: string }) => {
      const { reservationId, lastName } = params;
      console.log('🔍 Step 1: Starting reservation search for ID:', reservationId);
      
      if (!reservationId.trim()) {
        throw new Error('Reservation ID is required');
      }

      const response = await fetch(`/api/reservations/search-reservation?reservationId=${encodeURIComponent(reservationId)}&lastName=${encodeURIComponent(lastName)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to fetch reservation';
        
        if (response.status === 404) {
          throw new Error('BOOKING_ID_INVALID');
        } else if (response.status === 403) {
          throw new Error('NO_MATCHES_FOUND');
        } else if (response.status >= 500) {
          throw new Error('SERVER_ERROR');
        }
        
        throw new Error(errorMessage);
      }

      const reservation: ApaleoReservationResponse = await response.json();
      console.log('✅ Step 4: Reservation found in Apaleo:', reservation.id);

      if (!reservation || !reservation.id) {
        console.error('❌ Invalid reservation data');
        throw new Error('Reservation not found');
      }

      // Step 2: Get current user
      console.log('👤 Step 5: Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError);
        throw new Error('User not authenticated');
      }
      
      console.log('✅ Step 6: User authenticated:', user.id);

      // Step 3: Get email and last name from reservation
      const email = reservation.primaryGuest?.email || '';
      const reservationLastName = reservation.primaryGuest?.lastName || '';

      console.log('📝 Step 7: Reservation data - Email:', email, 'LastName:', reservationLastName);

      // Step 4: Insert reservation into Supabase
      console.log('💾 Step 8: Inserting reservation into Supabase...');
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
        console.error('❌ Insert error:', insertError);
        // Check if it's a unique constraint violation (already exists)
        if (insertError.code === '23505') {
          throw new Error('Reservation already added');
        }
        throw new Error(`Failed to save reservation: ${insertError.message}`);
      }

      console.log('✅ Step 9: Reservation successfully added to Supabase!');

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
