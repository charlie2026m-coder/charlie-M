'use client'
import { useState, useEffect, useRef } from 'react'
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
  onNavigate,
}: {
  height: number
  images: string[]
  roomName?: string
  onNavigate?: () => void
}) => {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const displayImages = images && images.length > 0 ? images : ['/images/image-placeholder.webp']
  const hasImages = images && images.length > 0

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    pointerStart.current = null
    if (dx < 5 && dy < 5) onNavigate?.()
  }

  return (
    // data-photo-slider: swipes starting here flip photos (inner carousel),
    // the outer rooms carousel ignores them via its watchDrag callback
    <div className="relative" data-photo-slider>
      <Carousel
        className="w-full relative"
        setApi={setApi}
        opts={{ loop: hasImages }}
      >
        <CarouselContent>
          {displayImages.map((image, index) => (
            <CarouselItem key={index}>
              <div
                className={`relative w-full overflow-hidden ${hasImages ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ height: `${height}px` }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
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

      {hasImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-[6px]">
          {(() => {
            const maxDots = 5
            if (count <= maxDots) {
              return Array.from({ length: count }).map((_, index) => (
                <button
                  key={index}
                  className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${index === current ? 'bg-white' : 'bg-white/50'}`}
                  onClick={() => api?.scrollTo(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))
            }
            let startIndex = 0
            if (current <= 1) startIndex = 0
            else if (current >= count - 2) startIndex = count - maxDots
            else startIndex = current - 2

            return Array.from({ length: maxDots }).map((_, i) => {
              const slideIndex = startIndex + i
              return (
                <button
                  key={slideIndex}
                  className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${slideIndex === current ? 'bg-white' : 'bg-white/50'}`}
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
