import { useQuery } from '@tanstack/react-query'
import { RoomOffer } from '@/types/offers'

interface UseAvailableRoomsParams {
  from?: string
  to?: string
  guests?: number
  enabled?: boolean
}

interface AvailableRoomsResponse {
  error?: string
}

export const useAvailableRooms = ({ from, to, guests = 1, enabled = true }: UseAvailableRoomsParams = {}) => {
  return useQuery<RoomOffer[] | AvailableRoomsResponse>({
    queryKey: ['available-rooms', from, to, guests],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      params.append('guests', guests.toString())

      const response = await fetch(`/api/rooms/available?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch available rooms')
      }

      return response.json()
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}
