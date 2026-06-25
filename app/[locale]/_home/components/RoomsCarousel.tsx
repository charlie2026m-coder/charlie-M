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

  // Translucent arrow overlaid on the carousel edges — vertically centered on
  // the card photo (260px tall) so it reads as a hint that the cards swipe.
  const arrowClassName =
    "absolute top-[142px] -translate-y-1/2 z-20 grid place-items-center size-10 sm:size-12 " +
    "rounded-full bg-white/60 backdrop-blur-sm border border-white/70 text-mute shadow-md " +
    "transition hover:bg-white/90 hover:text-dark active:scale-95"

  return (
    <div className="container px-2 xl:px-0 mb-15">
      <div className="relative">
        <Carousel
          className="w-full"
          setApi={setApi}
          opts={{
            loop: true,
            // Mobile/tablet: center the active card so neighbours peek on BOTH
            // sides — makes it obvious the cards swipe. Desktop (≥1024): align
            // to the start so exactly 3 full cards show with no half-card
            // "stubs" at the edges (basis-1/3 below); arrows still scroll.
            align: 'center',
            // keep centering working even with few slides (loop can't engage
            // with 1-2 slides and trimSnaps would left-align them)
            containScroll: false,
            // Gentler settle after a swipe (default 25) — feels smoother.
            duration: 32,
            breakpoints: {
              '(min-width: 1024px)': { align: 'start' },
            },
            // Drag the rooms carousel everywhere except the photo area —
            // there the inner PhotoSlider handles the swipe (photo flip)
            watchDrag: (_api, event) => {
              const target = event.target as HTMLElement | null
              return !target?.closest('[data-photo-slider]')
            },
          }}
        >
          {/* pt-3 gives the cards room to grow on hover (lg:hover:scale) without
              the carousel viewport (overflow-hidden) clipping their top edge. */}
          <CarouselContent className="ml-0 pt-3 pb-8 xl:pb-[90px]">
            {rooms.map((item) => (
              <CarouselItem
                key={`${item.id}-${item.arrival ?? ''}`}
                className="px-2 basis-[74%] sm:basis-[56%] md:basis-[44%] lg:basis-1/3 shrink-0"
              >
                <RoomCard item={item} locale={locale} translations={translations} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <button
          onClick={() => api?.scrollPrev()}
          className={`${arrowClassName} left-2 sm:left-5`}
          aria-label="Previous slide"
        >
          <GoArrowLeft className="size-5 sm:size-6" />
        </button>
        <button
          onClick={() => api?.scrollNext()}
          className={`${arrowClassName} right-2 sm:right-5`}
          aria-label="Next slide"
        >
          <GoArrowRight className="size-5 sm:size-6" />
        </button>
      </div>
    </div>
  )
}
