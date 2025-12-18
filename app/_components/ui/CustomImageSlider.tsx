'use client'
import { useState } from 'react'
import Image from 'next/image'

const CustomImageSlider = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0) 
  return (
    <div className='flex flex-col gap-7 mb-7'>
      <div className='relative w-full h-[250px] md:h-[400px] rounded-xl overflow-hidden'>
        {images.map((image, index) => (
          <div key={index} className={`absolute inset-0 ${index === currentIndex ? 'block' : 'hidden'}`}>
            <Image
              width={600}
              height={300}
              src={image}
              alt={`Slide ${index + 1}`}
              className='object-cover w-full h-full'
            /> 
          </div>
        ))}
      </div>

      
      <div className='flex justify-center gap-2'>
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`size-3 rounded-full transition-colors ${
              index === currentIndex ? 'bg-blue' : 'bg-gray-300'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default CustomImageSlider