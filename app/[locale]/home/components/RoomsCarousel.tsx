'use client'
import * as React from "react"
import type { CarouselApi } from '../../../_components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../../../_components/ui/carousel'
import RoomCard from '@/app/[locale]/home/components/RoomCard'
import type { SimpleRoom } from '@/types/offers'
import { GoArrowLeft, GoArrowRight } from "react-icons/go";

export function RoomsCarousel({
  items,
}: {
  items: SimpleRoom[]  
}) {
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

  const canScrollPrev = current > 0
  const canScrollNext = current < count - 1

  const buttonClassName = "size-18 rounded-full  border text-mute border-mute flex items-center justify-center transition-opacity hover:opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"

  return (
    <div className="container flex items-center px-4 xl:px-0 ">
      <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0 ">
        <button
          onClick={() => api?.scrollPrev()}
          disabled={!canScrollPrev}
          className={buttonClassName}
          aria-label="Previous slide"
        >
          <GoArrowLeft className="size-8" />
        </button>
      </div>

      <div className="flex-1 relative min-w-0 ">
        <Carousel className="w-full" setApi={setApi}>
          <CarouselContent className="-ml-4 pb-[90px] px-2">
            {items.map((item) => (
              <CarouselItem key={item.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3 shrink-0">
                <RoomCard item={item} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="xl:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={() => api?.scrollPrev()}
            disabled={!canScrollPrev}
            className={buttonClassName}
            aria-label="Previous slide"
          >
            <GoArrowLeft className="size-6 text-gray-700" />
          </button>
        </div>

        <div className="xl:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10">
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

      <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0">
        <button
          onClick={() => api?.scrollNext()}
          disabled={!canScrollNext}
          className={buttonClassName}
          aria-label="Next slide"
        >
          <GoArrowRight className="size-8 " />
        </button>
      </div>
    </div>
  )
}
