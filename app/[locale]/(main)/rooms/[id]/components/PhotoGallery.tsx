'use client'
import { IoMdImage } from "react-icons/io";
import { useState, useEffect, useCallback } from "react";
import Image from 'next/image'
import { Dialog, DialogContent } from "@/app/_components/ui/dialog";

import { IoChevronBack, IoChevronForward } from "react-icons/io5";

const PhotoGallery = ({ images, roomName }: { images: string[]; roomName?: string }) => {
  const [showImages, setShowImages] = useState<null | number>(null);

  // Check if there are no images
  const hasImages = images && images.length > 0

  const nextPhoto = useCallback(() => {
    setShowImages((current) => {
      if (current === null) return null
      if (current === images.length - 1) return 0
      return current + 1
    })
  }, [images.length])

  const prevPhoto = useCallback(() => {
    setShowImages((current) => {
      if (current === null) return null
      if (current === 0) return images.length - 1
      return current - 1
    })
  }, [images.length])

  useEffect(() => {
    if (showImages === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto()
      else if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImages, prevPhoto, nextPhoto])

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    prevPhoto()
  }

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    nextPhoto()
  }

  // Show placeholder if no images
  if (!hasImages) {
    return (
      <div className='mb-[30px]'>
        <div className='relative rounded-4xl overflow-hidden'>
          <Image 
            src='/images/image-placeholder.webp'
            alt='No images available' 
            width={1200} 
            height={300} 
            className='w-full h-[300px] object-cover' 
          />
        </div>
      </div>
    )
  }

  return (
    <div className='grid lg:grid-cols-2 gap-4  mb-[30px]'>
      
      <div className='lg:col-span-1 relative group rounded-4xl overflow-hidden'>
        <Image 
          onClick={() => setShowImages(0)}
          src={images[0]} 
          alt={roomName ? `${roomName} at Charlie M Hotel Berlin - main view` : 'Hotel room at Charlie M Hotel Berlin'} 
          width={600} 
          height={460} 
          className='w-full h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px] object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' 
        />
        <div className=' flex items-center gap-1  px-4 py-2 rounded-full bg-white absolute bottom-5 right-5'>
          <IoMdImage className='size-5 ' />{images.length} Photos
        </div>
      </div>

      {/* Right side - changes based on photo count */}
      <div className='lg:col-span-1 relative h-full'>
        {/* 2-4 photos: photos in a row */}
        {(images.length >= 2 && images.length <= 4) && (
          <div className='flex flex-row gap-4 h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px]'>
            {images.slice(1, 4).map((image, index) => (
              <div key={index} className='group rounded-[30px] overflow-hidden flex-1'>
                <Image 
                  onClick={() => setShowImages(index + 1)} 
                  src={image} 
                  alt={roomName ? `${roomName} - view ${index + 2}` : `Hotel room view ${index + 2}`} 
                  width={600} 
                  height={460} 
                  className='w-full h-full object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' 
                />
              </div>
            ))}
          </div>
        )}

        {/* 5+ photos: standard grid 2x2 */}
        {images.length >= 5 && (
          <div className='grid grid-cols-2 gap-4 h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px]'>
            {images.slice(1, 5).map((image, index) => (
              <div key={index} className='col-span-1 group rounded-[30px] overflow-hidden'>
                <Image 
                  onClick={() => setShowImages(index + 1)} 
                  src={image} 
                  alt={roomName ? `${roomName} - view ${index + 2}` : `Hotel room view ${index + 2}`} 
                  width={300} 
                  height={222} 
                  className='w-full h-[126px] md:h-[222px] object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' 
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog
        open={showImages !== null}
        onOpenChange={(open) => {
          if (!open) setShowImages(null)
        }}
      >
        <DialogContent
          className='p-0 !rounded-none w-fit max-w-[95vw] md:max-w-[90vw] overflow-hidden [&>button]:text-white [&>button]:z-10 [&>button]:top-2 [&>button]:right-2'
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className='flex items-center justify-center select-none'>
            <div className='relative'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[showImages || 0]}
                alt={roomName ? `${roomName} - view ${(showImages || 0) + 1}` : `Hotel room view ${(showImages || 0) + 1}`}
                className='w-auto h-auto max-w-[95vw] md:max-w-[90vw] max-h-[80vh] block cursor-pointer'
                onClick={nextPhoto}
              />
              <div onClick={handlePrevClick} className='absolute left-0 top-0 bottom-0 w-10 md:w-16 flex items-center justify-center cursor-pointer bg-gradient-to-l from-transparent to-black/40'>
                <IoChevronBack className='size-10 md:size-16 text-white drop-shadow-lg' />
              </div>
              <div onClick={handleNextClick} className='absolute right-0 top-0 bottom-0 w-10 md:w-16 flex items-center justify-center cursor-pointer bg-gradient-to-r from-transparent to-black/40'>
                <IoChevronForward className='size-10 md:size-16 text-white drop-shadow-lg' />
              </div>
              <div className='absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full whitespace-nowrap'>
                {(showImages || 0) + 1} / {images.length}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PhotoGallery