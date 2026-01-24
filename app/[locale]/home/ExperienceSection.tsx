'use client'
import { useTranslations } from 'next-intl'
import { BsCheck2Circle } from "react-icons/bs"
import { useState, useCallback } from 'react'
import ExpList from './components/ExpList'
import ConceptSlider from './components/ConceptSlider'
import MobileConcept from './components/MobileConcept'
import Image from 'next/image'
import Header from './components/Header'
const ExperienceSection = () => {
  const t = useTranslations('home')
  const [activeIndex, setActiveIndex] = useState(0)
  
  const handleActiveIndexChange = useCallback((index: number) => {
    console.log('ConceptSection received index:', index)
    setActiveIndex(index)
  }, [])

  const items = [
    {
      icon: <BsCheck2Circle className='size-5 lg:size-8' />,
      title: t('items.0.title'),
      text: t('items.0.text'),
      imageText: t('items.0.content'),
      image: '/images/exp-1.webp',
    },
    {
      icon: <Image src='/images/luggage-icon.svg' alt='luggage image' width={32} height={32} className='object-cover size-5 lg:size-8' />,
      title: t('items.1.title'),
      text: t('items.1.text'),
      imageText: t('items.1.content'),
      image: '/images/exp-2.webp',
    },
    {
      icon: <Image src='/images/closet-icon.svg' alt='concept-icon' width={32} height={32} className='object-cover size-5 lg:size-8' />,

      title: t('items.2.title'),
      text: t('items.2.text'),
      imageText: t('items.2.content'),
      image: '/images/exp-3.webp',
    },
    {
      icon: <Image src='/images/laundry-icon.svg' alt='concept-icon' width={32} height={32} className='object-cover size-5 lg:size-8' />,

      title: t('items.3.title'),
      text: t('items.3.text'),
      imageText: t('items.3.content'),
      image: '/images/exp-4.webp',
    },
    {
      icon: <Image src='/images/coffee-m-icon.svg' alt='concept-icon' width={32} height={32} className='object-cover size-5 lg:size-8' />,

      title: t('items.4.title'),
      text: t('items.4.text'),
      imageText: t('items.4.content'),
      image: '/images/exp-5.webp',
    },
    {
      icon: <Image src='/images/wifi-icon.svg' alt='concept-icon' width={32} height={32} className='object-cover size-5 lg:size-8' />,

      title: t('items.5.title'),
      text: t('items.5.text'),
      imageText: t('items.5.content'),
      image: '/images/exp-6.webp',
    },
  ]

  return (
    <div className='w-full flex flex-col container px-4 xl:px-[100px] mb-5 lg:mb-0 lg:py-20'>
      <div className=' lg:hidden flex justify-center'> 
        <Header title={t('experience_title')} />
      </div>
      <MobileConcept items={items} title={t('experience_title')} />
      <div className='hidden lg:grid grid-cols-[53fr_47fr] gap-5'>
        <ConceptSlider items={items} activeIndex={activeIndex} height={840} />
        <ExpList items={items} onActiveIndexChange={handleActiveIndexChange} />
      </div>
      <div className='border-b w-full mt-5 lg:hidden'/>
    </div>
  )
}

export default ExperienceSection
