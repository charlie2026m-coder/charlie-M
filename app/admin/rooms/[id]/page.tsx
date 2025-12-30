'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUpdateRoom } from '@/app/hooks/useUpdateRoom'
import { useUploadMultiplePhotos, useDeletePhoto } from '@/app/hooks/useRoomPhotos'
import { RoomDetails } from '@/services/getRoomsDetails'
import { Button } from '@/app/_components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { IoArrowBack, IoTrash } from 'react-icons/io5'
import { MdAdd } from 'react-icons/md'
import Image from 'next/image'

export default function EditRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletePhotoUrl, setDeletePhotoUrl] = useState<string | null>(null)

  // Form state
  const [groupName, setGroupName] = useState('')
  const [attributes, setAttributes] = useState('')
  const [maxPersons, setMaxPersons] = useState(1)
  const [size, setSize] = useState(0)

  const updateRoom = useUpdateRoom()
  const uploadPhotos = useUploadMultiplePhotos()
  const deletePhoto = useDeletePhoto()

  useEffect(() => {
    checkAuthAndLoadRoom()
  }, [roomId])

  const checkAuthAndLoadRoom = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase
      .from('admins')
      .select('role')
      .eq('email', user.email!)
      .single()

    if (!adminData) {
      router.push('/admin/login')
      return
    }

    setIsAdmin(true)

    const { data: roomData, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error || !roomData) {
      console.error('Error loading room:', error)
      router.push('/admin/rooms')
      return
    }

    setRoom(roomData)
    setGroupName(roomData.group_name)
    setAttributes(roomData.attributes.join(', '))
    setMaxPersons(roomData.max_persons)
    setSize(roomData.size)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const attributesArray = attributes
      .split(',')
      .map(attr => attr.trim())
      .filter(attr => attr.length > 0)

    updateRoom.mutate(
      {
        id: roomId,
        group_name: groupName,
        attributes: attributesArray,
        max_persons: maxPersons,
        size: size,
      },
      {
        onSuccess: () => {
          alert('Room updated successfully!')
          router.push('/admin/rooms')
        },
        onError: (error) => {
          alert(`Failed to update room: ${error.message}`)
        },
      }
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)

    uploadPhotos.mutate(
      { roomId, files: filesArray },
      {
        onSuccess: (data) => {
          console.log(`Successfully uploaded ${data.totalUploaded} out of ${filesArray.length} photos`)
          checkAuthAndLoadRoom()
          // Reset input
          if (e.target) {
            e.target.value = ''
          }
        },
        onError: (error) => {
          console.error('Failed to upload photos:', error)
          alert('Failed to upload some photos')
          // Reset input
          if (e.target) {
            e.target.value = ''
          }
        },
      }
    )
  }

  const handleDeletePhoto = (photoUrl: string) => {
    deletePhoto.mutate(
      { roomId, photoUrl },
      {
        onSuccess: () => {
          setDeletePhotoUrl(null)
          checkAuthAndLoadRoom()
        },
        onError: (error) => {
          alert(`Failed to delete photo: ${error.message}`)
        },
      }
    )
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            onClick={() => router.push('/admin/rooms')}
            variant="outline"
            size="sm"
            className="gap-1.5 border-black text-black hover:bg-black hover:text-white h-8"
          >
            <IoArrowBack className="size-3.5" />
            Back
          </Button>
          
          <div className="font-mono text-sm font-bold">{room?.id}</div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Room Details Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="space-y-4">
              {/* First row: Name, Max Guests, Size */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">
                    Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">
                    Max Guests
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={maxPersons}
                    onChange={(e) => setMaxPersons(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">
                    Size (m²)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Second row: Attributes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">
                  Attributes (comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={attributes}
                  onChange={(e) => setAttributes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  placeholder="king, balcony, terrace"
                />
              </div>
            </div>

            {/* Action Buttons for Room Details */}
            <div className="flex gap-3 mt-6 pt-6 border-t-2 border-gray-100">
              <Button
                type="submit"
                disabled={updateRoom.isPending}
                className=" gap-2 h-10 bg-black text-white hover:bg-black/50 hover:text-white"
              >
                {updateRoom.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                onClick={() => router.push('/admin/rooms')}
                variant="outline"
                className=" gap-2 border-black text-black hover:bg-black hover:text-white h-10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>

        {/* Photos Section - Separate from form */}
        <div className="border-2 border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Photos ({room?.photos?.length || 0})</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Upload Square - Always first */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-50 transition-colors group"
            >
              <MdAdd className="size-8 text-gray-400 group-hover:text-black transition-colors mb-2" />
              <span className="text-xs text-gray-500 group-hover:text-black transition-colors font-medium">
                {uploadPhotos.isPending ? 'Uploading...' : 'Add Photo'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadPhotos.isPending}
            />

            {/* Existing Photos */}
            {room?.photos && room.photos.map((photo, index) => (
              <div key={index} className="relative group aspect-square border-2 border-gray-200 rounded-lg overflow-hidden">
                <Image
                  src={photo}
                  alt={`Room photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
                
                {/* Delete Button with Popover */}
                <Popover open={deletePhotoUrl === photo} onOpenChange={(open) => !open && setDeletePhotoUrl(null)}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDeletePhotoUrl(photo)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <IoTrash className="size-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm">Delete Photo?</h4>
                        <p className="text-xs text-gray-600">
                          This action cannot be undone.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletePhotoUrl(null)}
                          className="flex-1 h-8 text-xs border-black"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={deletePhoto.isPending}
                          className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deletePhoto.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            💡 Click the square to upload photos • You can select multiple photos at once • Photos are saved automatically
          </p>
        </div>
      </div>
    </div>
  )
}
