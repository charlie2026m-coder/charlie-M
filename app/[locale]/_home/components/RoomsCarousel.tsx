'use client'
import * as React from "react"
import { useState, useEffect } from "react"
import type { CarouselApi } from '../../../_components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../../../_components/ui/carousel'
import RoomCard from '@/app/[locale]/_home/components/RoomCard'
import type { HomeRoomCard } from '@/types/offers'
import { GoArrowLeft, GoArrowRight } from "react-icons/go"
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store/useStore'
import { getDate } from '@/lib/utils'
import { getPrices } from '@/app/actions/apaleo/rooms/getPrices'

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
  const dateRange = useStore(state => state.dateRange)
  const guests = useStore(state => state.guests)

  const from = dateRange.from ? getDate(dateRange.from) : undefined
  const to = dateRange.to ? getDate(dateRange.to) : undefined

  const [debouncedFrom, setDebouncedFrom] = useState(from)
  const [debouncedTo, setDebouncedTo] = useState(to)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFrom(from)
      setDebouncedTo(to)
    }, 600)
    return () => clearTimeout(timer)
  }, [from, to])

  const { data: prices } = useQuery({
    queryKey: ['home-room-prices', debouncedFrom, debouncedTo, guests.adults],
    queryFn: () => getPrices(debouncedFrom, debouncedTo, guests.adults),
    staleTime: 1000 * 60 * 5,
    enabled: !!debouncedFrom && !!debouncedTo,
  })

  // Merge static room data with live prices; sort available rooms first
  const roomsWithPrices: HomeRoomCard[] = React.useMemo(() => {
    const merged = items.map(item => {
      const priceData = prices?.find(p => p.roomId === item.id)
      return {
        ...item,
        oneNightPrice: priceData?.minNightPrice ?? item.oneNightPrice,
        isBooked: prices ? !priceData : item.isBooked,
      }
    })
    return [...merged].sort((a, b) => {
      if (a.isBooked === b.isBooked) return 0
      return a.isBooked ? 1 : -1
    })
  }, [items, prices])

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
          <Carousel className="w-full" setApi={setApi} >
            <CarouselContent className="-ml-4 pb-8 xl:pb-[90px] px-2">
              {roomsWithPrices.map((item) => (
                <CarouselItem key={item.id} className="pl-4 basis-[85%] md:basis-1/2 xl:basis-1/3 shrink-0">
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
