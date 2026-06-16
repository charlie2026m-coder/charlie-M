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
import { useTranslations } from 'next-intl'

import type { GoogleReview } from '@/services/getGoogleReviews'

interface Props {
  reviews?: GoogleReview[];
}

const ReviewsSection = ({ reviews }: Props) => {
  const displayItems = reviews && reviews.length > 0 ? reviews : items;
  const t = useTranslations('home')
  const [api, setApi] = useState<CarouselApi>()

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


const items =[
  {
    name: 'Sarah Mitchell',
    review: 'Absolutely stunning hotel! The rooms are spacious and beautifully designed. The staff went above and beyond to make our stay memorable. The breakfast buffet was incredible with so many options. Will definitely be returning!',
  },
  {
    name: 'Michael Chen',
    review: 'Great location in the heart of the city. The room was clean and comfortable, though a bit smaller than expected. The concierge service was very helpful with restaurant recommendations. Overall a pleasant stay.',
  },
  {
    name: 'Emma Thompson',
    review: 'Perfect weekend getaway! The spa facilities are top-notch and the rooftop bar has amazing views. The bed was incredibly comfortable - best sleep I\'ve had in ages. Highly recommend the deluxe suite!',
  },
  {
    name: 'David Rodriguez',
    review: 'The hotel has a modern, elegant design. Service was professional and efficient. Only minor issue was the WiFi being a bit slow in our room, but it was manageable. Great value for money.',
  },
  {
    name: 'Olivia Williams',
    review: 'Exceeded all expectations! From the moment we arrived, the staff made us feel special. The room had a beautiful view and was spotlessly clean. The restaurant serves delicious food. Can\'t wait to come back!',
  },
  {
    name: 'James Anderson',
    review: 'Absolutely stunning hotel! The rooms are spacious and beautifully designed. The staff went above and beyond to make our stay memorable. The breakfast buffet was incredible with so many options. Will definitely be returning!',
  },
  {
    name: 'Sophie Martin',
    review: 'Luxurious experience from start to finish! The attention to detail is impressive - fresh flowers in the room, turn-down service, premium toiletries. The location is perfect for exploring the city. Worth every penny!',
  },
  {
    name: 'Robert Taylor',
    review: 'Comfortable stay for business travel. The conference facilities are excellent and the business center is well-equipped. Staff was accommodating with early check-in. Good selection of restaurants nearby.',
  },
  {
    name: 'Isabella Garcia',
    review: 'Beautiful hotel with incredible architecture. The lobby is breathtaking and the rooms are tastefully decorated. The spa treatments were relaxing. Only wish we could have stayed longer!',
  },
  {
    name: 'Thomas Brown',
    review: 'Solid hotel experience. Clean rooms, friendly staff, and good location. The breakfast was decent but could use more variety. Parking was convenient. Would stay here again for the price point.',
  },
  {
    name: 'Charlotte Davis',
    review: 'Absolutely loved our stay! The hotel has a unique charm and character. The staff remembered our names and preferences. The room was spacious with a lovely balcony. Perfect romantic getaway destination!',
  },
]