'use client'
import * as React from 'react'
import Image from 'next/image'
import type { CarouselApi } from '../ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../ui/carousel'

const VibeSlider = ({
  images,
}: {
  images: string[]
}) => {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  // Автоматическая прокрутка каждые 5 секунд
  React.useEffect(() => {
    if (!api) return

    const interval = setInterval(() => {
      api.scrollNext()
    }, 10000)

    return () => clearInterval(interval)
  }, [api])

  return (
    <div className="relative w-full">
      <Carousel 
        className="w-full" 
        setApi={setApi}
        opts={{
          loop: true,
          watchDrag: false,
          align: "center",
          slidesToScroll: 1,
        }}
      >
        <CarouselContent className="py-10 -ml-[85px]">
          {images.map((image, index) => (
            <CarouselItem key={index} className="pl-10 lg:pl-[70px] basis-1/2">
              <div 
                className={`relative w-full h-[250px] lg:h-[480px] rounded-[40px] overflow-hidden transition-all duration-500 ${
                  index === current 
                    ? 'scale-120 lg:scale-110 z-10' 
                    : 'scale-100 opacity-70 z-0'
                }`}
              >
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
      <div className="flex items-center justify-center gap-[6px] mt-6">
        {(() => {
          const maxDots = 5
          
          if (count <= maxDots) {
            return Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                  index === current ? 'bg-brown' : 'bg-gray-300'
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))
          }

          let startIndex = Math.max(0, Math.min(current - 2, count - maxDots))

          return Array.from({ length: maxDots }).map((_, i) => {
            const slideIndex = startIndex + i
            if (slideIndex >= count) return null
            
            return (
              <button
                key={slideIndex}
                className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                  slideIndex === current ? 'bg-brown' : 'bg-gray-300'
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

export default VibeSlider