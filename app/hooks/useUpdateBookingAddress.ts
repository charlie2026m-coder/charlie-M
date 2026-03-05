import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UpdateAddressData {
  updatedGuestData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      addressLine1: string;
      addressLine2: string;
      postalCode: string;
      city: string;
      countryCode: string;
    };
    company?: {
      name?: string;
    };
  };
}

export const useUpdateBookingAddress = (reservationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAddressData) => {
      const response = await fetch(`/api/reservations/${reservationId}/booker-address`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update address');
      }

      return response.json();
    },
    onMutate: () => {
      toast.loading('Updating address...', { id: 'update-address' });
    },
    onSuccess: () => {
      toast.success('Address updated successfully', { id: 'update-address' });
      queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update address', { id: 'update-address' });
    },
  });
};
