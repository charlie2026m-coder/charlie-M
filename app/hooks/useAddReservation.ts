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

  return useMutation<AddReservationResponse, Error, string>({
    mutationFn: async (reservationId: string) => {
      console.log('🔍 Step 1: Starting reservation search for ID:', reservationId);
      
      if (!reservationId.trim()) {
        throw new Error('Reservation ID is required');
      }

      // Step 1: Check if reservation exists in Apaleo
      console.log('🌐 Step 2: Fetching reservation from Apaleo...');
      const response = await fetch(`/api/reservations/${reservationId}`);
      
      console.log('📡 Step 3: Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error('❌ Reservation not found in Apaleo');
          throw new Error('Reservation not found');
        }
        console.error('❌ Failed to fetch reservation:', response.status);
        throw new Error(`Failed to fetch reservation: ${response.status}`);
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
      const lastName = reservation.primaryGuest?.lastName || '';

      console.log('📝 Step 7: Reservation data - Email:', email, 'LastName:', lastName);

      // Step 4: Insert reservation into Supabase
      console.log('💾 Step 8: Inserting reservation into Supabase...');
      const { error: insertError } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          reservation_id: reservation.id,
          booking_id: reservation.bookingId || '',
          last_name: lastName,
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
