import { useQuery } from '@tanstack/react-query';

interface UnitFloorResponse {
  floor: string | null;
}

async function getUnitFloor(unitId: string): Promise<UnitFloorResponse> {
  const response = await fetch(`/api/unit/${unitId}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch unit floor');
  }

  return response.json();
}

export function useUnit(unitId: string | null | undefined, enabled: boolean = true) {
  return useQuery<UnitFloorResponse, Error>({
    queryKey: ['unit-floor', unitId],
    queryFn: () => getUnitFloor(unitId!),
    enabled: enabled && !!unitId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
