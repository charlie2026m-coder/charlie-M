'use client'
import Header from "./components/Header"
import { useTranslations } from 'next-intl'
import { GoArrowLeft, GoArrowRight } from "react-icons/go";
import { Button } from "@/app/_components/ui/button";
import { useState } from "react";
import Image from "next/image";

const DesignSection = ({ locale }: { locale: string }) => {
  const t = useTranslations()
  const [activeItem, setActiveItem] = useState(0)
  const items = [
    {
      text: t('home.design_items.0.text'),
      image_1: '/images/room-ex.webp',
      image_2: '/images/room-ex-2.webp',
      image_title_1: t('home.design_items.0.image_1'),
      image_title_2: t('home.design_items.0.image_2'),
    },
    {
      text: t('home.design_items.1.text'),
      image_1: '/images/location-1.png',
      image_2: '/images/location-2.svg',
      image_title_1: t('home.design_items.1.image_1'),
      image_title_2: t('home.design_items.1.image_2'),
    },
    {
      text: t('home.design_items.2.text'),
      image_1: '/images/room-ex.webp',
      image_2: '/images/room-ex-2.webp',
      image_title_1: t('home.design_items.2.image_1'),
      image_title_2: t('home.design_items.2.image_2'),
    },
    {
      text: t('home.design_items.3.text'),
      image_1: '/images/location-3.svg',
      image_2: '/images/location-4.svg',
      image_title_1: t('home.design_items.3.image_1'),
      image_title_2: t('home.design_items.3.image_2'),
    },
    {
      text: t('home.design_items.4.text'),
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

  return (
    <div className='flex flex-col container px-4 xl:px-[100px] py-20'>
      <Header title={t('home.design_title')} size='md' />

      <div className='pt-20 grid grid-cols-3 gap-8'>
        <div className='flex flex-col pb-25 justify-end'>
          <p className='text-[#6E6E6E] inter text-[17px] leading-[31px]'>{items[activeItem].text}</p>
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


