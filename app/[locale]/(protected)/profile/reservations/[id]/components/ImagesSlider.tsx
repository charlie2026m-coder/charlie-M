'use client'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import Image from 'next/image'
import { useState } from 'react';

const ImagesSlider = ({ images }: { images: string[] }) => {
  const [showImages, setShowImages] = useState<null | number>(null);
  const nextPhoto = () => {
    if (showImages === null) {
      setShowImages(0)
    } else if (showImages < images.length - 1) {
      setShowImages(showImages + 1)
    }
  }

  const prevPhoto = () => {
    if (showImages === null) return
    if (showImages > 0) {
      setShowImages(showImages - 1)
    }
  }
  return (
    <div>
      <div className='flex h-[280px] w-full relative select-none'>
        <Image 
          src={images[showImages || 0]} 
          alt='room' 
          fill 
          className='w-full h-[280px] object-cover rounded-4xl cursor-pointer' 
          onClick={nextPhoto}
        />
        <div onClick={prevPhoto} className='absolute left-0 top-0 bottom-0 w-10 md:w-20 bg-gradient-to-l from-transparent to-black/50 hover:to-black/70 flex items-center justify-start pl-2 rounded-l-4xl transition-all'>
          <IoChevronBack className='size-10 cursor-pointer text-white'  />
        </div>
        <div onClick={nextPhoto} className='absolute right-0 top-0 bottom-0 w-10 md:w-20 bg-gradient-to-r from-transparent to-black/50 hover:to-black/70 flex items-center justify-end pr-2 rounded-r-4xl transition-all'>
          <IoChevronForward className='size-10 cursor-pointer text-white'  />
        </div>
      </div>

      <div className='flex items-center justify-between w-full mt-2'>
        <div className='text-sm px-5 text-dark  mx-auto'>
          {(showImages || 0) + 1} / {images.length}
        </div>
      </div>
    </div> 
  )
}

export default ImagesSlider