'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { CarouselApi } from '@/app/_components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/app/_components/ui/carousel'
import { GoArrowLeft, GoArrowRight } from "react-icons/go"

interface DesignItem {
  image: string
  title: string
}

const DesignSlider = ({ items }: { items: DesignItem[] }) => {
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

  const canScrollPrev = current > 0
  const canScrollNext = current < count - 1

  const buttonClassName = "size-18 rounded-full border text-mute border-mute flex items-center justify-center transition-opacity hover:opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"

  return (
    <>
      <div className="container flex items-center px-2 xl:px-0 lg:hidden pt-8">
        <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0">
          <button
            onClick={() => api?.scrollPrev()}
            disabled={!canScrollPrev}
            className={buttonClassName}
            aria-label="Previous slide"
          >
            <GoArrowLeft className="size-8" />
          </button>
        </div>

        <div className="flex-1 relative min-w-0">
          <Carousel 
            className="w-full" 
            setApi={setApi}
            opts={{
              loop: true,
            }}
          >
            <CarouselContent className="-ml-4 pb-8 xl:pb-[90px] px-2">
              {items.map((item, index) => (
                <CarouselItem key={index} className="pl-4 basis-[85%] md:basis-1/2 xl:basis-1/3 shrink-0">
                  <div className="flex flex-col gap-5 items-center">
                    <Image 
                      src={item.image} 
                      alt={item.title} 
                      width={384} 
                      height={384} 
                      className="w-full aspect-square object-cover rounded-[40px]"
                    />
                    <p className="text-center text-mute font-bold text-[20px] px-4">
                      {item.title}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0">
          <button
            onClick={() => api?.scrollNext()}
            disabled={!canScrollNext}
            className={buttonClassName}
            aria-label="Next slide"
          >
            <GoArrowRight className="size-8" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 mb-15 lg:hidden">
        <div className="xl:hidden">
          <button
            onClick={() => api?.scrollPrev()}
            disabled={!canScrollPrev}
            className={buttonClassName}
            aria-label="Previous slide"
          >
            <GoArrowLeft className="size-6 text-gray-700" />
          </button>
        </div>

        <div className="xl:hidden">
          <button
            onClick={() => api?.scrollNext()}
            disabled={!canScrollNext}
            className={buttonClassName}
            aria-label="Next slide"
          >
            <GoArrowRight className="size-6 text-gray-700" />
          </button>
        </div>
      </div>
    </>
  )
}

export default DesignSlider