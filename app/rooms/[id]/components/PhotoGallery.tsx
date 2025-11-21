'use client'
import { IoMdImage } from "react-icons/io";
import { useState } from "react";
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/_components/ui/dialog";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa6";

const PhotoGallery = () => {
  const [showImages, setShowImages] = useState<null | number>(null);

  const images = [
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
  ]

  const nextPhoto = () => {
    if (showImages === images.length - 1 || showImages === null) return
    setShowImages(showImages + 1)
  }

  const prevPhoto = () => {
    if (showImages === 0 || showImages === null) return
    setShowImages(showImages - 1)
  }
  return (
    <div className='grid lg:grid-cols-2 gap-4  mb-[30px]'>
      
      <div className='lg:col-span-1 relative group rounded-4xl overflow-hidden'>
        <Image 
          onClick={() => setShowImages(0)}
          src={images[0]} 
          alt='room' 
          width={600} 
          height={460} 
          className='w-full h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px] object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' 
        />
        <div className=' flex items-center gap-1 text-brown px-4 py-2 rounded-full bg-white/85 absolute bottom-5 right-5'>
          <IoMdImage className='size-5 text-brown' />{images.length} Photos
        </div>
      </div>

      <div className='lg:col-span-1 grid grid-cols-2 gap-4 relative'>
        {images.slice(1, 5).map((image, index) => (
          <div key={index} className='col-span-1 group rounded-[30px] overflow-hidden'>
            <Image onClick={() => setShowImages(index)} src={image} alt='room' width={300} height={222} className='w-full h-[126px] md:h-[222px] object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' />
          </div>
        ))}
      </div>
      <Dialog open={showImages !== null} onOpenChange={() =>setShowImages(null)}>
        <DialogContent className='!max-w-[50%] px-12 rounded-4xl'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-bold'>Photo Gallery</DialogTitle>
          </DialogHeader>
          <Image src={images[showImages || 0]} alt='room' width={720} height={440} className='w-full h-[440px] object-cover rounded-4xl' />

          <div className='flex items-center justify-between w-full'>
            <FaArrowLeft 
              onClick={prevPhoto} 
              className={`size-5 ${showImages === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
            />
            <div className='text-xl px-5 py-2 rounded-full border border-blue'>
              {(showImages || 0) + 1} / {images.length}
            </div>
            <FaArrowRight 
              onClick={nextPhoto} 
              className={`size-5  ${showImages === images.length - 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PhotoGallery