'use client'
import { useState } from 'react'
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

// Translucent arrow overlaid on the slide (centered), same hint pattern as the
// rooms carousel — replaces the buttons that used to sit below the slider.
const arrowClassName =
  "absolute top-1/2 -translate-y-1/2 z-20 grid place-items-center size-10 sm:size-12 " +
  "rounded-full bg-white/60 backdrop-blur-sm border border-white/70 text-mute shadow-md " +
  "transition hover:bg-white/90 hover:text-dark active:scale-95"

const DesignSlider = ({ items }: { items: DesignItem[] }) => {
  const [api, setApi] = useState<CarouselApi>()

  return (
    <div className="container flex items-center px-2 xl:px-0 lg:hidden pt-8">
      <div className="flex-1 relative min-w-0">
        <Carousel
          className="w-full"
          setApi={setApi}
          opts={{ loop: true }}
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

        <button
          onClick={() => api?.scrollPrev()}
          className={`${arrowClassName} left-2 sm:left-3`}
          aria-label="Previous slide"
        >
          <GoArrowLeft className="size-5 sm:size-6" />
        </button>
        <button
          onClick={() => api?.scrollNext()}
          className={`${arrowClassName} right-2 sm:right-3`}
          aria-label="Next slide"
        >
          <GoArrowRight className="size-5 sm:size-6" />
        </button>
      </div>
    </div>
  )
}

export default DesignSlider
