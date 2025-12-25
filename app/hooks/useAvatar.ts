import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-provider'
import { profileKeys } from './useProfile'

interface AvatarData {
  avatarUrl: string | null
  originalAvatarUrl: string | null
}

export const avatarKeys = {
  all: ['avatar'] as const,
  detail: (id: string) => [...avatarKeys.all, id] as const,
}

export const useAvatar = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: avatarKeys.detail(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) return { avatarUrl: null, originalAvatarUrl: null }

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, original_avatar_url')
        .eq('id', user.id)
        .single()

      if (error) throw error

      return {
        avatarUrl: data?.avatar_url || null,
        originalAvatarUrl: data?.original_avatar_url || null,
      } as AvatarData
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ croppedFile, originalFile }: { croppedFile: File; originalFile?: File }) => {
      if (!user?.id) throw new Error('No user ID')

      const timestamp = Date.now()
      
      // Upload cropped image
      const croppedExt = croppedFile.name.split('.').pop()
      const croppedFileName = `${user.id}/avatar-${timestamp}.${croppedExt}`
      
      const { error: croppedError } = await supabase.storage
        .from('avatars')
        .upload(croppedFileName, croppedFile, { upsert: true })

      if (croppedError) throw croppedError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(croppedFileName)

      // Upload original image if provided
      let originalPublicUrl = null
      if (originalFile) {
        originalPublicUrl = originalFile.name
      }

      // Update database
      const updateData: { avatar_url: string; original_avatar_url?: string | null } = { 
        avatar_url: publicUrl 
      }
      
      if (originalFile) {
        updateData.original_avatar_url = originalPublicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) throw updateError

      return { avatarUrl: publicUrl, originalAvatarUrl: originalPublicUrl || data?.originalAvatarUrl || null }
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(avatarKeys.detail(user?.id || ''), newData)
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user?.id || '') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // Delete from storage
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id)

      if (files && files.length > 0) {
        const filesToDelete = files.map(file => `${user.id}/${file.name}`)
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete)
      }

      // Clear in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: null,
          original_avatar_url: null 
        })
        .eq('id', user.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.setQueryData(avatarKeys.detail(user?.id || ''), { avatarUrl: null, originalAvatarUrl: null })
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user?.id || '') })
    },
  })

  return {
    avatarUrl: data?.avatarUrl || null,
    originalAvatarUrl: data?.originalAvatarUrl || null,
    uploadAvatar: (croppedFile: File, originalFile?: File) => uploadMutation.mutateAsync({ croppedFile, originalFile }),
    deleteAvatar: () => deleteMutation.mutateAsync(),
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

