'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { CarouselApi } from '@/app/_components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/app/_components/ui/carousel'

const PhotoSlider = ({
  height,
  images,
  roomName,
}: {
  height: number
  images: string[]
  roomName?: string
}) => {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  // Use placeholder if no images
  const displayImages = images && images.length > 0 ? images : ['/images/image-placeholder.webp']
  const hasImages = images && images.length > 0

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const handlePhotoClick = () => {
    if (hasImages) {
      api?.scrollNext()
    }
  }

  return (
    <div className="relative">
      <Carousel 
        className="w-full relative" 
        setApi={setApi}
        opts={{
          loop: hasImages,
          watchDrag: false,
        }}
      >
 
        <CarouselContent>
          {displayImages.map((image, index) => (
            <CarouselItem key={index}>
              <div 
                className={`relative w-full overflow-hidden ${hasImages ? 'cursor-pointer' : ''}`}
                style={{ height: `${height}px` }}
                onClick={handlePhotoClick}
              >
                <Image 
                  src={image} 
                  alt={hasImages ? (roomName ? `${roomName} - view ${index + 1}` : `Hotel room view ${index + 1}`) : 'No image available'} 
                  fill
                  className="object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots - only show if there are actual images */}
      {hasImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-[6px]">
        {(() => {
          const maxDots = 5
          
          if (count <= maxDots) {
            return Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                  index === current ? 'bg-white' : 'bg-white/50'
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))
          }

          let startIndex = 0
          
          if (current <= 1) {
            startIndex = 0
          } else if (current >= count - 2) {
            startIndex = count - maxDots
          } else {
            startIndex = current - 2
          }

          return Array.from({ length: maxDots }).map((_, i) => {
            const slideIndex = startIndex + i
            
            return (
              <button
                key={slideIndex}
                className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                  slideIndex === current ? 'bg-white' : 'bg-white/50'
                }`}
                onClick={() => api?.scrollTo(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}`}
              />
            )
          })
        })()}
        </div>
      )}
    </div>
  )
}

export default PhotoSlider