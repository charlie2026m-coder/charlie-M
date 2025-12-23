'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { CarouselApi } from '../ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../ui/carousel'

const PhotoSlider = ({
  height,
  images,
  category = 'Category A'
}: {
  height: number
  images: string[]
  category?: string
}) => {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <div className="relative">
      <Carousel 
        className="w-full relative" 
        setApi={setApi}
        opts={{
          loop: true,
          watchDrag: false,
        }}
      >
 
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative w-full overflow-hidden " style={{ height: `${height}px` }}>
                <Image 
                  src={image} 
                  alt={`Photo ${index + 1}`} 
                  fill
                  className="object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots */}
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

          // Вычисляем окно из 3 точек с центрированием активной точки
          let startIndex
          if (current === 0) {
            startIndex = 0
          } else if (current >= count - 1) {
            startIndex = count - maxDots
          } else {
            startIndex = current - 1
          }

          return Array.from({ length: Math.min(maxDots, count) }).map((_, i) => {
            const slideIndex = startIndex + i
            if (slideIndex >= count) return null
            
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
    </div>
  )
}

export default PhotoSlider