'use client'
import Header from "./components/Header"
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'
import Image from "next/image"
import { useState } from 'react'
import type { CarouselApi } from '@/app/_components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/app/_components/ui/carousel'
import { GoArrowLeft, GoArrowRight } from "react-icons/go"
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'
import { useTranslations } from 'next-intl'

import type { GoogleReview } from '@/services/getGoogleReviews'

interface Props {
  reviews?: GoogleReview[];
}

// Five stars, half-star aware — the rating comes with every Google review, so
// showing it costs nothing and marks the block as verified rather than decorative.
function Stars({ value }: { value: number }) {
  return (
    <span className='inline-flex items-center gap-0.5 text-dark-gold' aria-hidden='true'>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1
        if (value >= n) return <FaStar key={i} />
        if (value >= n - 0.5) return <FaStarHalfAlt key={i} />
        return <FaRegStar key={i} className='text-dark-gold/30' />
      })}
    </span>
  )
}

const ReviewsSection = ({ reviews }: Props) => {
  const t = useTranslations('home')
  const [api, setApi] = useState<CarouselApi>()

  // Only ever render REAL Google reviews. This block used to fall back to a
  // hard-coded array of invented testimonials praising a breakfast buffet, spa,
  // rooftop bar and conference facilities — advertising amenities as guest
  // experience is exactly the misleading claim UWG §5a targets, and it showed
  // whenever the Places API was unset or failing. No reviews → no section.
  const displayItems = reviews ?? []
  if (displayItems.length === 0) return null

  // Translucent arrows overlaid on the review card (centered), matching the
  // rooms carousel — replaces the buttons that used to sit below the carousel.
  const arrowClassName =
    "absolute top-1/2 -translate-y-1/2 z-20 grid place-items-center size-10 sm:size-12 " +
    "rounded-full bg-white/60 backdrop-blur-sm border border-white/70 text-mute shadow-md " +
    "transition hover:bg-white/90 hover:text-dark active:scale-95"

  return (
    <div className='flex flex-col container px-4 xl:px-[100px] pt-0 pb-10 lg:py-20'>
      <Header title={t('reviews_title')} />

      <div className="md:hidden">
        <div className="container flex items-center px-2 mt-5 lg:mt-20">
          <div className="flex-1 relative min-w-0">
            <Carousel 
              className="w-full" 
              setApi={setApi}
              opts={{
                loop: true,
                align: "center",
              }}
            >
              <CarouselContent className="-ml-4 pb-8 px-2">
                {displayItems.map((item, index) => (
                  <CarouselItem key={`${item.name}-${index}`} className="pl-4 basis-[75%] shrink-0">
                    <div className="flex flex-col gap-4 rounded-[40px] bg-[#F4F4F4] px-5 py-8 h-full">
                      <Image src='/images/icons/comas-icon.svg' alt={item.name} width={74} height={74} className="object-cover size-15 md:size-[74px]" />
                      <Stars value={item.rating} />
                      <p className="text-mute inter md:mb-7 text-xs md:text-base">{item.review}</p>
                      <p className="text-mute italic text-end text-sm md:text-base font-bold mt-auto">{item.name}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            <button
              onClick={() => api?.scrollPrev()}
              className={`${arrowClassName} left-1 sm:left-3`}
              aria-label="Previous slide"
            >
              <GoArrowLeft className="size-5 sm:size-6" />
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className={`${arrowClassName} right-1 sm:right-3`}
              aria-label="Next slide"
            >
              <GoArrowRight className="size-5 sm:size-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block xl:hidden mt-20">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={16}
          slidesPerView={2}
          speed={1500}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          loop={true}
          className="reviews-swiper"
        >
          {displayItems.map((item, index) => (
            <SwiperSlide key={`${item.name}-${index}`} style={{ height: 'auto' }}>
              <div className="flex flex-col gap-4 rounded-[40px] bg-[#F4F4F4] px-5 py-8 h-full">
                <Image src='/images/icons/comas-icon.svg' alt={item.name} width={74} height={74} className="object-cover size-[74px]" />
                <Stars value={item.rating} />
                <p className="text-mute inter mb-7">{item.review}</p>
                <p className="text-mute italic text-end font-bold mt-auto">{item.name}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="hidden xl:block mt-20">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={16}
          slidesPerView={3}
          speed={1500}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          loop={true}
          className="reviews-swiper"
        >
          {displayItems.map((item, index) => (
            <SwiperSlide key={`${item.name}-${index}`} style={{ height: 'auto' }}>
              <div className="flex flex-col gap-4 rounded-[40px] bg-[#F4F4F4] px-5 py-8 h-full">
                <Image src='/images/icons/comas-icon.svg' alt={item.name} width={74} height={74} className="object-cover size-[74px]" />
                <Stars value={item.rating} />
                <p className="text-mute inter mb-7">{item.review}</p>
                <p className="text-mute italic text-end font-bold mt-auto">{item.name}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

    </div>
  )
}

export default ReviewsSection
