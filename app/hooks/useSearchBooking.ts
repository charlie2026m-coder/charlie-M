import { useMutation } from '@tanstack/react-query';

interface SearchBookingParams {
  externalCode: string;
  lastName: string;
}

export function useSearchBooking() {
  return useMutation({
    mutationFn: async (params: SearchBookingParams) => {
      const response = await fetch(`/api/bookings/search?externalCode=${params.externalCode}&lastName=${params.lastName}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to search booking');
      return data;
    },
  });
}

