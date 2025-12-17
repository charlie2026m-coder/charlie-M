import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { MdEdit } from "react-icons/md";
import { BsUpload } from "react-icons/bs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog'
import { Button } from '@/app/_components/ui/button'
import { useAvatar } from '@/app/hooks/useAvatar'
import { Spinner } from '@/app/_components/ui/spinner';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const AvatarComponent = () => {
  const { avatarUrl, originalAvatarUrl, uploadAvatar, deleteAvatar, isUploading, isDeleting } = useAvatar()
  const [openEditAvatarModal, setOpenEditAvatarModal] = useState(false)
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)
  const getDefaultCrop = (): Crop => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

    if (isMobile) {
      return {
        unit: 'px',
        width: 100,
        height: 100,
        x: 10,
        y: 10,
      }
    }

    return {
      unit: 'px',
      width: 250,
      height: 250,
      x: 10,
      y: 10,
    }
  }

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [defaultCrop, setDefaultCrop] = useState<Crop>(() => getDefaultCrop())
 
  const [crop, setCrop] = useState<Crop>(defaultCrop)
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const loadImage = () => {
    fileInputRef.current?.click()
  }

  const handleEditAvatar = async () => {
    if (!originalAvatarUrl) return
    
    const responsiveCrop = getDefaultCrop()
    setDefaultCrop(responsiveCrop)
    setCrop(responsiveCrop)
    setCompletedCrop(null)
    
    // Load original image for cropping
    setPreviewImage(originalAvatarUrl)
    setOpenEditAvatarModal(true)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file format
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedFormats.includes(file.type)) {
      alert('Please select a valid image format (JPG, PNG, WebP)')
      return
    }

    // Create preview and open modal
    const reader = new FileReader()
    reader.onload = () => {
      const responsiveCrop = getDefaultCrop()
      setDefaultCrop(responsiveCrop)
      setCrop(responsiveCrop)
      setCompletedCrop(null)
      
      setPreviewImage(reader.result as string)
      setOriginalFile(file)
      setOpenEditAvatarModal(true)
    }
    reader.readAsDataURL(file)
  }

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return Promise.reject(new Error('No 2d context'))
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const handleSaveCrop = async () => {
    if (!completedCrop || !imgRef.current) return

    try {
      // Create cropped image
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })

      // Upload cropped (and original if it's first time upload)
      await uploadAvatar(croppedFile, originalFile || undefined)

      setOpenEditAvatarModal(false)
      setPreviewImage(null)
      setOriginalFile(null)
    } catch (error) {
      console.error('Error cropping image:', error)
      alert('Failed to crop image')
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar()
      setOpenDeleteConfirm(false)
      setOpenEditAvatarModal(false)
    } catch (error) {
      console.error('Error deleting avatar:', error)
      alert('Failed to delete avatar')
    }
  }

  return (
    <>
      <div className='relative size-[92px] cursor-pointer mx-auto' >
        <div className='w-full h-full rounded-full border-white'>
          {avatarUrl &&
            <>
              <Image 
                src={avatarUrl || "/images/cat-icon.jpg"} alt="profile photo" 
                width={92} height={92} 
                className='rounded-full object-cover w-full h-full' 
              /> 
              <div onClick={handleEditAvatar} className='absolute bottom-0 size-[28px] flex items-center justify-center right-0 bg-blue rounded-full p-1'>
                <MdEdit className='size-4' />
              </div>
            </>
            }
            {!avatarUrl && 
              <>
                <div onClick={loadImage} className='w-full h-full flex items-center justify-center bg-gray-200 rounded-full group'>
                  <input ref={fileInputRef} type="file"  accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                  {isUploading 
                    ? <Spinner className='size-8 text-blue' />
                    :<>
                        <Image src="/images/user-icon.svg" alt="profile photo" width={45} height={45} className=' object-cover size-8 group-hover:opacity-0 transition-opacity duration-300 translate-x-1/2' />
                        <BsUpload className='size-8 p-1 text-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-1/2' />
                      </>
                    }
                </div>
                <div onClick={loadImage} className='absolute bottom-0 size-[28px] flex items-center justify-center right-0 bg-blue rounded-full p-1'>
                  <MdEdit className='size-4' />
                </div>
              </>
          }
        </div>
      </div>

      <Dialog open={openEditAvatarModal} onOpenChange={() => setOpenEditAvatarModal(false)}>
        <DialogContent className='!max-w-[800px] px-4 lg:px-12 rounded-4xl overflow-hidden w-9/10'>
          <DialogHeader>
            <DialogTitle className='text-2xl text-center mb-[30px]'>Crop the Photo</DialogTitle>
          </DialogHeader>
          
          {previewImage && (
            <div className='flex flex-col gap-6'>
              <div className='flex justify-center items-center w-full'>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className='w-full'
                >
                  <img
                    ref={imgRef}
                    src={previewImage}
                    alt='Preview'
                    crossOrigin='anonymous'
                    className='w-full h-auto object-contain'
                  />
                </ReactCrop>
              </div>

              <div className={`flex gap-3 ${avatarUrl ? 'justify-between' : 'justify-end'}`}>
                
                <div className='flex gap-3 w-full md:justify-end'>
                {avatarUrl ? (
                    <Button 
                      variant='destructive' 
                      onClick={() => setOpenDeleteConfirm(true)}
                      className='h-12 px-8 flex-1 md:flex-0'
                    >
                      Delete
                    </Button>
                  ):(
                    <Button 
                      variant='outline' 
                      onClick={() => {
                        setOpenEditAvatarModal(false)
                      }}
                      className='h-12 px-8 flex-1 md:flex-0'
                    >
                      Cancel
                    </Button>)
                }
                  <Button 
                    onClick={handleSaveCrop}
                    disabled={isUploading || !completedCrop}
                    className='h-12 px-8 flex-1 md:flex-0'
                  >
                    {isUploading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-xl text-center mb-4'>Delete Avatar</DialogTitle>
          </DialogHeader>
          
          <div className='flex flex-col gap-6 '>
            <p className='text-center text-gray-600'>
              Are you sure you want to delete your avatar? This action cannot be undone.
            </p>
            
            <div className='flex gap-3 md:justify-end w-full'>
              <Button 
                variant='outline' 
                onClick={() => setOpenDeleteConfirm(false)}
                disabled={isDeleting}
                className='h-12 px-8 flex-1 md:flex-0'
              >
                Cancel
              </Button>
              <Button 
                variant='destructive'
                onClick={handleDeleteAvatar}
                disabled={isDeleting}
                className='h-12 px-8 flex-1 md:flex-0'
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    
    </>
  )
}

export default AvatarComponent
