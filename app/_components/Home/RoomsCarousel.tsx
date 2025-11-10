import * as React from "react"
import type { CarouselApi } from '../ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../ui/carousel'
import RoomCard from './RoomCard'
import type { Beds24RoomType } from '@/types/beds24'
export function RoomsCarousel({
  items,
}: {
  items: Beds24RoomType[]
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

  return (
    <div className="flex flex-col ">
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent className="pb-10">
          {items.map((item) => (
            <CarouselItem key={item.id} className="basis-[416px] shrink-0 pr-4">
              <RoomCard title={item.name} extra={''} price={item.minPrice} squareMeters={item.roomSize} beds={item.roomType} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-[5px] pt-[50px]">
        {(() => {
          const maxDots = 5
          if (count <= maxDots) {
            return Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                className={`size-[14px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                  index === current ? 'bg-blue' : 'bg-[#C4D4E5]'
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))
          }

          let startIndex = Math.max(0, Math.min(current - 2, count - maxDots))

          return Array.from({ length: maxDots }).map((_, i) => {
            const slideIndex = startIndex + i
            return (
              <button
                key={slideIndex}
                className={`size-[14px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                  slideIndex === current ? 'bg-blue' : 'bg-[#C4D4E5]'
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
