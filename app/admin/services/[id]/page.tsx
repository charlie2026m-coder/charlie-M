'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { ServiceDetails } from '@/app/actions/supabase/services/getServicesDetails'
import { useUpdateService } from '@/app/hooks/useUpdateService'
import { useUploadServicePhoto, useDeleteServicePhoto, getServiceImageUrl } from '@/app/hooks/useServicePhoto'
import { Button } from '@/app/_components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { IoArrowBack, IoTrash } from 'react-icons/io5'
import { MdAdd } from 'react-icons/md'

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [service, setService] = useState<ServiceDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletePhotoOpen, setDeletePhotoOpen] = useState(false)

  const [titleEn, setTitleEn] = useState('')
  const [titleDe, setTitleDe] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionDe, setDescriptionDe] = useState('')

  const updateService = useUpdateService()
  const uploadPhoto = useUploadServicePhoto()
  const deletePhoto = useDeleteServicePhoto()

  useEffect(() => {
    checkAuthAndLoad()
  }, [serviceId])

  const checkAuthAndLoad = async () => {
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

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single()

    if (error || !data) {
      console.error('Error loading service:', error)
      router.push('/admin/services')
      return
    }
    setService(data)
    setTitleEn(data.title_en)
    setTitleDe(data.title_de)
    setDescriptionEn(data.description_en ?? '')
    setDescriptionDe(data.description_de ?? '')
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateService.mutate(
      {
        id: serviceId,
        title_en: titleEn,
        title_de: titleDe,
        description_en: descriptionEn || null,
        description_de: descriptionDe || null,
      },
      {
        onSuccess: () => {
          alert('Service updated successfully!')
          router.push('/admin/services')
        },
        onError: (err) => {
          alert(`Failed to update: ${(err as Error).message}`)
        },
      }
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadPhoto.mutate(
      { serviceId, file },
      {
        onSuccess: () => {
          checkAuthAndLoad()
          e.target.value = ''
        },
        onError: (err) => {
          alert(`Upload failed: ${(err as Error).message}`)
          e.target.value = ''
        },
      }
    )
  }

  const handleDeletePhoto = () => {
    if (!service?.image_path) return
    deletePhoto.mutate(
      { serviceId, imagePath: service.image_path },
      {
        onSuccess: () => {
          setDeletePhotoOpen(false)
          checkAuthAndLoad()
        },
        onError: (err) => {
          alert(`Delete failed: ${(err as Error).message}`)
        },
      }
    )
  }

  const imageUrl = service?.image_path ? getServiceImageUrl(service.image_path) : null

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin/services">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-black text-black hover:bg-black hover:text-white h-8"
            >
              <IoArrowBack className="size-3.5" />
              Back
            </Button>
          </Link>
          <div className="font-mono text-sm font-bold">{service?.id}</div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Title (EN)</label>
                  <input
                    type="text"
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Title (DE)</label>
                  <input
                    type="text"
                    required
                    value={titleDe}
                    onChange={(e) => setTitleDe(e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Description (EN)</label>
                  <textarea
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Description (DE)</label>
                  <textarea
                    value={descriptionDe}
                    onChange={(e) => setDescriptionDe(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-y"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-6 border-t-2 border-gray-100">
              <Button
                type="submit"
                disabled={updateService.isPending}
                className="gap-2 h-10 bg-black text-white hover:bg-black/50 hover:text-white"
              >
                {updateService.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Link href="/admin/services">
                <Button type="button" variant="outline" className="gap-2 border-black text-black hover:bg-black hover:text-white h-10">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </form>

        <div className="border-2 border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Image</h2>
          <div className="flex flex-wrap items-start gap-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              className="aspect-square w-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-50 transition-colors group"
            >
              <MdAdd className="size-8 text-gray-400 group-hover:text-black transition-colors mb-2" />
              <span className="text-xs text-gray-500 group-hover:text-black transition-colors font-medium">
                {uploadPhoto.isPending ? 'Uploading...' : imageUrl ? 'Replace' : 'Add Photo'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadPhoto.isPending}
            />

            {imageUrl && (
              <div className="relative group aspect-square w-40 border-2 border-gray-200 rounded-lg overflow-hidden">
                <Image src={imageUrl} alt={service?.title_en ?? 'Service'} fill className="object-cover" />
                <Popover open={deletePhotoOpen} onOpenChange={setDeletePhotoOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDeletePhotoOpen(true)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <IoTrash className="size-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Delete image?</h4>
                      <p className="text-xs text-gray-600">This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDeletePhotoOpen(false)} className="flex-1 h-8 text-xs border-black">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleDeletePhoto} disabled={deletePhoto.isPending} className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                          {deletePhoto.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">One image per service. Upload replaces the current image.</p>
        </div>
      </div>
    </div>
  )
}
