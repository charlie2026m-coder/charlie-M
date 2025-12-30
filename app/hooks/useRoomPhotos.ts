import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'

interface UploadPhotoParams {
  roomId: string
  file: File
}

interface UploadMultiplePhotosParams {
  roomId: string
  files: File[]
}

interface DeletePhotoParams {
  roomId: string
  photoUrl: string
}

// Compress image before upload
async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Max file size in MB
    maxWidthOrHeight: 1920, // Max width or height
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  }

  try {
    const compressedFile = await imageCompression(file, options)
    console.log('Original size:', (file.size / 1024 / 1024).toFixed(2), 'MB')
    console.log('Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB')
    return compressedFile
  } catch (error) {
    console.error('Compression error:', error)
    return file // Return original if compression fails
  }
}

export function useUploadPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, file }: UploadPhotoParams) => {
      // Compress image before upload
      const compressedFile = await compressImage(file)

      // Generate unique filename
      const fileExt = 'jpg' // Always use jpg after compression
      const fileName = `${roomId}/${Date.now()}.${fileExt}`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('room-photos')
        .upload(fileName, compressedFile, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('room-photos')
        .getPublicUrl(fileName)

      // Update room photos array
      const { data: room } = await supabase
        .from('rooms')
        .select('photos')
        .eq('id', roomId)
        .single()

      const updatedPhotos = [...(room?.photos || []), publicUrl]

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ photos: updatedPhotos })
        .eq('id', roomId)

      if (updateError) throw updateError

      return { publicUrl, roomId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] })
    },
  })
}

// Hook for uploading multiple photos at once (prevents race condition)
export function useUploadMultiplePhotos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, files }: UploadMultiplePhotosParams) => {
      // Compress and upload all files
      const uploadedUrls: string[] = []

      for (const file of files) {
        try {
          // Compress image
          const compressedFile = await compressImage(file)

          // Generate unique filename
          const fileExt = 'jpg'
          const fileName = `${roomId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('room-photos')
            .upload(fileName, compressedFile, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error for file:', file.name, uploadError)
            continue // Skip this file and continue with others
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('room-photos')
            .getPublicUrl(fileName)

          uploadedUrls.push(publicUrl)

          // Small delay to ensure unique timestamps
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error('Error processing file:', file.name, error)
        }
      }

      // Update room photos array once with all new URLs
      const { data: room } = await supabase
        .from('rooms')
        .select('photos')
        .eq('id', roomId)
        .single()

      const updatedPhotos = [...(room?.photos || []), ...uploadedUrls]

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ photos: updatedPhotos })
        .eq('id', roomId)

      if (updateError) throw updateError

      return { uploadedUrls, roomId, totalUploaded: uploadedUrls.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] })
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, photoUrl }: DeletePhotoParams) => {
      // Extract file path from URL
      const urlParts = photoUrl.split('/room-photos/')
      const filePath = urlParts[1]

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('room-photos')
        .remove([filePath])

      if (deleteError) throw deleteError

      // Update room photos array
      const { data: room } = await supabase
        .from('rooms')
        .select('photos')
        .eq('id', roomId)
        .single()

      const updatedPhotos = (room?.photos || []).filter((url: string) => url !== photoUrl)

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ photos: updatedPhotos })
        .eq('id', roomId)

      if (updateError) throw updateError

      return { roomId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] })
    },
  })
}

