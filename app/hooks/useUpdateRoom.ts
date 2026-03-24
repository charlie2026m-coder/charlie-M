import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { RoomDetails } from '@/services/getRoomsDetails'
import { revalidateRooms } from '@/app/actions/revalidateRooms'

interface UpdateRoomData {
  id: string
  title_en: string
  title_de: string
  description_en?: string | null
  description_de?: string | null
  attributes: string[]
  max_persons: number
  size: number
  photos?: string[]
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateRoomData) => {
      const { id, ...updateData } = data

      const { data: updatedRoom, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return updatedRoom
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', data.id] })
      revalidateRooms()
    },
    onError: (error) => {
      console.error('Failed to update room:', error)
    },
  })
}

export function useGetRoom(id: string) {
  const queryClient = useQueryClient()

  return {
    data: queryClient.getQueryData<RoomDetails>(['room', id]),
    refetch: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      queryClient.setQueryData(['room', id], data)
      return data
    }
  }
}

