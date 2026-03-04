import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'

const BUCKET = 'services'

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  }
  try {
    return await imageCompression(file, options)
  } catch {
    return file
  }
}

export function useUploadServicePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceId, file }: { serviceId: string; file: File }) => {
      const compressed = await compressImage(file)
      const fileExt = 'jpg'
      const filePath = `${serviceId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('services')
        .update({ image_path: filePath })
        .eq('id', serviceId)

      if (updateError) throw updateError
      return { serviceId, filePath }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service', data.serviceId] })
    },
  })
}

export function useDeleteServicePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceId, imagePath }: { serviceId: string; imagePath: string }) => {
      const { error: deleteError } = await supabase.storage.from(BUCKET).remove([imagePath])
      if (deleteError) throw deleteError

      const { error: updateError } = await supabase
        .from('services')
        .update({ image_path: null })
        .eq('id', serviceId)
      if (updateError) throw updateError
      return { serviceId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service', data.serviceId] })
    },
  })
}

export function getServiceImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}
