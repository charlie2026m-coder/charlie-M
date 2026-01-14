'use client'
import * as React from 'react'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Mousewheel, Pagination } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'

import 'swiper/css'
import 'swiper/css/pagination'

interface ConceptSliderProps {
  items: {
    image: string
    imageText: string
  }[]
  activeIndex?: number
  height?: number
}

const ConceptSlider = ({ items, activeIndex = 0, height = 638 }: ConceptSliderProps) => {
  const [swiperInstance, setSwiperInstance] = React.useState<SwiperType | null>(null)

  React.useEffect(() => {
    if (swiperInstance && activeIndex !== undefined) {
      console.log('Sliding to index:', activeIndex)
      swiperInstance.slideTo(activeIndex)
    }
  }, [activeIndex, swiperInstance])


  return (
    <div className='relative w-full overflow-hidden '>
      <Swiper
        style={{ height: `${height}px` }}
        direction="vertical"
        slidesPerView={1}
        spaceBetween={32}
        mousewheel={false}
        speed={1000}
        allowTouchMove={false}
        modules={[Mousewheel, Pagination]}
        onSwiper={setSwiperInstance}
        className="h-full"
      >
        {items.map((item, index) => (
          <SwiperSlide key={index}>
            <div className='relative w-full h-full rounded-[50px] overflow-hidden group'>
              <Image 
                src={item.image} 
                alt={`Concept ${index + 1}`} 
                fill
                className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent' />
              <div className='absolute bottom-0 left-0 right-0 py-10 px-12 text-white z-10'>
                <p className='text-[20px] text-[#F7F5F2]'>{item.imageText}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}

export default ConceptSlider
