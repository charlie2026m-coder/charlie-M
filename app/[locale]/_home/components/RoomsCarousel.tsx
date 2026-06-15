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
import { GoArrowLeft, GoArrowRight } from "react-icons/go"

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
    nextAvailable?: string
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

  // Items are computed server-side (RoomsSection): one card per room type at its
  // nearest bookable night with that night's price. Just guard against any
  // stragglers marked unavailable.
  const rooms = items.filter(item => !item.isBooked)

  const buttonClassName = "size-18 rounded-full border text-mute border-mute flex items-center justify-center transition-opacity hover:opacity-50"

  return (
    <>
      <div className="container flex items-center px-2 xl:px-0">
        <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0">
          <button onClick={() => api?.scrollPrev()} className={buttonClassName} aria-label="Previous slide">
            <GoArrowLeft className="size-8" />
          </button>
        </div>

        <div className="flex-1 relative min-w-0">
          <Carousel
            className="w-full"
            setApi={setApi}
            opts={{
              loop: true,
              align: 'center',
              // keep the active card centered even when few rooms are available
              // (loop can't engage with 1-2 slides and trimSnaps would left-align them)
              containScroll: false,
              breakpoints: { '(min-width: 768px)': { align: 'start' } },
              // Drag the rooms carousel everywhere except the photo area —
              // there the inner PhotoSlider handles the swipe (photo flip)
              watchDrag: (_api, event) => {
                const target = event.target as HTMLElement | null
                return !target?.closest('[data-photo-slider]')
              },
            }}
          >
            <CarouselContent className="ml-0 pb-8 xl:pb-[90px]">
              {rooms.map((item) => (
                <CarouselItem key={item.id} className="px-2 basis-[80%] md:basis-1/2 xl:basis-1/3 shrink-0">
                  <RoomCard item={item} locale={locale} translations={translations} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="hidden xl:flex w-[92px] items-center justify-center shrink-0">
          <button onClick={() => api?.scrollNext()} className={buttonClassName} aria-label="Next slide">
            <GoArrowRight className="size-8" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 mb-15">
        <div className="xl:hidden">
          <button onClick={() => api?.scrollPrev()} className={buttonClassName} aria-label="Previous slide">
            <GoArrowLeft className="size-6 text-gray-700" />
          </button>
        </div>
        <div className="xl:hidden">
          <button onClick={() => api?.scrollNext()} className={buttonClassName} aria-label="Next slide">
            <GoArrowRight className="size-6 text-gray-700" />
          </button>
        </div>
      </div>
    </>
  )
}
