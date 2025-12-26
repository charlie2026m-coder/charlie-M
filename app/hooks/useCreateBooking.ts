import { useMutation } from '@tanstack/react-query';
import { Booking } from '@/types/booking';
import { toast } from 'sonner';
// import { useStore } from '@/store/useStore';

interface CreateBookingResponse {
  id: string;
  bookingId: string;
  reservations: Array<{
    id: string;
    reservationId: string;
    status: string;
  }>;
}

export const useCreateBooking = () => {
  // const setValue = useStore(state => state.setValue)

  return useMutation({
    mutationFn: async (booking: Booking): Promise<CreateBookingResponse> => {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create booking: ${response.status}`);
      }

      return await response.json();
    },
    onMutate: () => {
      toast.loading('Creating your booking...', { id: 'create-booking' });
    },
    onSuccess: (data) => {
      toast.success('Booking created successfully!', { id: 'create-booking' });
      console.log('Booking created:', data);
      
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create booking', { id: 'create-booking' });
      console.error('Booking error:', error);
    },
  });
};

