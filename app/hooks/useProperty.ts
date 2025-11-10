import { useQuery } from '@tanstack/react-query';

export const propertyKeys = {
  all: ['property'] as const,
};

export function useProperty() {
  return useQuery({
    queryKey: propertyKeys.all,
    queryFn: async () => {
      const res = await fetch('/api/property');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch property');
      }
      const response = await res.json();
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}