import { useQuery } from '@tanstack/react-query';

export const roomKeys = {
  all: ['room'] as const,
};

export function useRooms() {
  return useQuery({
    queryKey: roomKeys.all,
    queryFn: async () => {
      const res = await fetch('/api/rooms');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch property');
      }
      const response = await res.json();

      if (Array.isArray(response)) {
        return response;
      }

      if (response?.data) {
        return response.data;
      }

      return response ?? [];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useRoomById(id: string, date: string) {
  return useQuery({
    queryKey: [...roomKeys.all, id],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${id}?date=${date}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch property');
      }
      const response = await res.json();

      return response;
    },
    staleTime: 30 * 60 * 1000,
  });
}