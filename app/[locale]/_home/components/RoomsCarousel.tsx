'use client'
import * as React from "react"
import type { CarouselApi } from '../../../_components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../../../_components/ui/carousel'
import RoomCard from '@/app/[locale]/_home/components/RoomCard'
import type { HomeRoomCard } from '@/types/offers'
import { GoArrowLeft, GoArrowRight } from "react-icons/go";

export function RoomsCarousel({
  items,
  locale,
  translations,
}: {
  items: HomeRoomCard[]
  locale: string
  translations: {
    perNightFrom: string
    loading: string
    bookNow: string
    booked?: string
    roomParams: {
      max: string
      kingSize: string
      queenSize: string
      single: string
      balcony: string
      terrace: string
    }
  }
}) {
  const [api, setApi] = React.useState<CarouselApi>()
  const buttonClassName = "size-18 rounded-full  border text-mute border-mute flex items-center justify-center transition-opacity hover:opacity-50"
  return (
    <>
      <div className="container flex items-center px-2 xl:px-0 ">
        <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0 ">
          <button
            onClick={() => api?.scrollPrev()}
            className={buttonClassName}
            aria-label="Previous slide"
          >
            <GoArrowLeft className="size-8" />
          </button>
        </div>

        <div className="flex-1 relative min-w-0 ">
          <Carousel className="w-full" setApi={setApi} opts={{ loop: true }}>
            <CarouselContent className="-ml-4 pb-8 xl:pb-[90px] px-2">
              {items.map((item) => (
                <CarouselItem key={item.id} className="pl-4 basis-[85%] md:basis-1/2 xl:basis-1/3 shrink-0">
                  <RoomCard item={item} locale={locale} translations={translations} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
        <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0">
          <button
            onClick={() => api?.scrollNext()}
            className={buttonClassName}
            aria-label="Next slide"
          >
            <GoArrowRight className="size-8 " />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-5 mb-15">
        <div className="xl:hidden ">
          <button
            onClick={() => api?.scrollPrev()}
            className={buttonClassName}
            aria-label="Previous slide"
          >
            <GoArrowLeft className="size-6 text-gray-700" />
          </button>
        </div>

        <div className="xl:hidden ">
          <button
            onClick={() => api?.scrollNext()}
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
