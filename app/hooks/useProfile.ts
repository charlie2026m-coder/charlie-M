import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-provider'
import { toast } from 'sonner'

export interface Profile {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  birthday: string | null
  passport_number: string | null
  home_address: string | null
  avatar_url: string | null
  original_avatar_url: string | null
  created_at: string
  updated_at: string
}

export const profileKeys = {
  all: ['profile'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
}

export const useProfile = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: profileKeys.detail(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) throw fetchError

      return data as Profile
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('No user ID')

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      return data as Profile
    },
    onMutate: () => {
      toast.loading('Updating profile...')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.detail(user?.id || ''), data)
      toast.success('Profile updated successfully!')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    },
    onSettled: () => {
      toast.dismiss()
    },
  })

  return {
    profile,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    updateMutation,
    refreshProfile: () => queryClient.invalidateQueries({ queryKey: profileKeys.detail(user?.id || '') }),
  }
}

