import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateServiceData {
  id: string
  title_en: string
  title_de: string
  description_en?: string | null
  description_de?: string | null
  image_path?: string | null
}

export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateServiceData) => {
      const { id, ...updateData } = data
      const { data: updated, error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service', data.id] })
    },
    onError: (error) => {
      console.error('Failed to update service:', error)
    },
  })
}
