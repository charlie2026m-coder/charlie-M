import { useMutation } from '@tanstack/react-query';

interface Reservation {
  id: string;
  confirmationCode: string;
  status: string;
  guestAppUrl: string;
}

export function usePreCheckIn() {
  return useMutation<Reservation | null, Error, string>({
    mutationFn: async (reservationId: string) => {
      if (!reservationId) throw new Error('Reservation ID is required');

      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch reservation');
      }

      const data = await response.json();
      return data;
    },
  });
}
