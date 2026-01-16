'use client'
import Header from "./components/Header"
import { useTranslations } from 'next-intl'
import { GoArrowLeft, GoArrowRight } from "react-icons/go";
import { Button } from "@/app/_components/ui/button";
import { useState } from "react";
import Image from "next/image";
import DesignSlider from "./components/DesignSlider";

const DesignSection = ({ locale }: { locale: string }) => {
  const t = useTranslations()
  const [activeItem, setActiveItem] = useState(0)
  const items = [
    {
      image_1: '/images/room-ex.webp',
      image_2: '/images/room-ex-2.webp',
      image_title_1: t('home.design_items.0.image_1'),
      image_title_2: t('home.design_items.0.image_2'),
    },
    {
      image_1: '/images/location-1.png',
      image_2: '/images/location-2.svg',
      image_title_1: t('home.design_items.1.image_1'),
      image_title_2: t('home.design_items.1.image_2'),
    },
    {
      image_1: '/images/room-ex.webp',
      image_2: '/images/room-ex-2.webp',
      image_title_1: t('home.design_items.2.image_1'),
      image_title_2: t('home.design_items.2.image_2'),
    },
    {
      image_1: '/images/location-3.svg',
      image_2: '/images/location-4.svg',
      image_title_1: t('home.design_items.3.image_1'),
      image_title_2: t('home.design_items.3.image_2'),
    },
    {
      image_1: '/images/room-ex.webp',
      image_2: '/images/room-ex-2.webp',
      image_title_1: t('home.design_items.4.image_1'),
      image_title_2: t('home.design_items.4.image_2'),
    }
  ]

  const handlePrevious = () => {
    setActiveItem((prev) => (prev === 0 ? items.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveItem((prev) => (prev === items.length - 1 ? 0 : prev + 1))
  }

  // Prepare slider items for mobile (flatten all images with titles)
  const sliderItems = items.flatMap(item => [
    { image: item.image_1, title: item.image_title_1 },
    { image: item.image_2, title: item.image_title_2 }
  ])

  return (
    <div className='flex flex-col container px-4 xl:px-[100px] py-5 lg:py-20'>
      <Header title={t('home.design_title')}/>
      <p className='text-[#6E6E6E] lg:hidden inter text-[14px] text-center'>
        {t('home.design_description')}
      </p>

      <DesignSlider items={sliderItems} />

      <div className='hidden lg:grid pt-4 lg:pt-20 grid-cols-3 gap-8'>

        <div className='flex flex-col  justify-between'>
          <p className='text-[#6E6E6E] inter text-[17px] leading-[31px]'>{t('home.design_description')}  </p>
          <nav className='flex items-center gap-8 mt-8'>
            <Button 
              variant="outline" 
              className='size-[70px] border-mute text-mute'
              onClick={handlePrevious}
            >
              <GoArrowLeft className='size-7' />
            </Button>
            <Button 
              variant="outline" 
              className='size-[70px] border-mute text-mute'
              onClick={handleNext}
            >
              <GoArrowRight className='size-7' />
            </Button>
          </nav>

        </div>

        <div className="flex flex-col gap-5 items-center">
          <Image 
            src={items[activeItem].image_1} 
            alt={items[activeItem].image_title_1} 
            width={384} 
            height={384} 
            className="size-[384px] object-cover rounded-[40px]"
          />
          <p className="text-center text-mute font-bold text-[25px]">{items[activeItem].image_title_1}</p>
        </div>

        <div className="flex flex-col gap-5 items-center">
          <Image 
            src={items[activeItem].image_2} 
            alt={items[activeItem].image_title_2} 
            width={384} 
            height={384} 
            className="size-[384px] object-cover rounded-[40px]"
          />
          <p className="text-center text-mute font-bold text-[25px]">{items[activeItem].image_title_2}</p>
        </div>
      </div>
    </div>
  )
}

export default DesignSection;


