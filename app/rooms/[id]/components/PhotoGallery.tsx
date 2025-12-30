'use client'
import { IoMdImage } from "react-icons/io";
import { useState } from "react";
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/_components/ui/dialog";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

const PhotoGallery = ({ images }: { images: string[] }) => {
  const [showImages, setShowImages] = useState<null | number>(null);

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
        <div className=' flex items-center gap-1  px-4 py-2 rounded-full bg-white absolute bottom-5 right-5'>
          <IoMdImage className='size-5 ' />{images.length} Photos
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
        <DialogContent className='px-5 md:px-12 rounded-4xl w-full max-w-[95%] lg:max-w-[80%] max-h-[80vh] flex flex-col '>
          <DialogHeader>
            <DialogTitle className='text-2xl font-bold'>Photo Gallery</DialogTitle>
          </DialogHeader>
          <div className='flex items-center gap-2 w-full relative select-none'>
            <Image 
              src={images[showImages || 0]} 
              alt='room' 
              width={720} 
              height={440} 
              className='max-h-[calc(80vh-140px)] w-full object-contain rounded-4xl cursor-pointer' 
              onClick={() => setShowImages(showImages === null ? 0 : showImages + 1)}
            />
            <div onClick={prevPhoto} className='absolute left-0 bg-light1/50 hover:bg-gray-200/50 top-0 bottom-0 w-10 md:w-20 flex items-center justify-center  rounded-l-4xl'>
              <IoChevronBack className='size-10 md:size-20 cursor-pointer text-black'  />
            </div>
            <div onClick={nextPhoto} className='absolute right-0 bg-light1/50 hover:bg-gray-200/50 top-0 bottom-0 w-10 md:w-20 flex items-center justify-center  rounded-r-4xl'>
              <IoChevronForward className='size-10 md:size-20 cursor-pointer text-black'  />
            </div>
          </div>

          <div className='flex items-center justify-between w-full'>
            
            <div className='text-xl px-5 pb-5 mx-auto'>
              {(showImages || 0) + 1} / {images.length}
            </div>
           
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PhotoGallery