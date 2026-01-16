'use client'
import Header from './components/Header'
import { useTranslations } from 'next-intl'
import { BsCheck2Circle } from "react-icons/bs"
import Image from 'next/image'
import { PiCalendarDots } from "react-icons/pi"
import { PiChatTeardropTextLight } from "react-icons/pi"
import ConceptList from './components/ConceptList'
import ConceptSlider from './components/ConceptSlider'
import { useState, useCallback } from 'react'
import MobileConcept from './components/MobileConcept'

const ConceptSection = () => {
  const t = useTranslations('home')
  const [activeIndex, setActiveIndex] = useState(0)
  
  const handleActiveIndexChange = useCallback((index: number) => {
    console.log('ConceptSection received index:', index)
    setActiveIndex(index)
  }, [])

  const conceptItems = [
    {
      icon: <BsCheck2Circle className='size-5 lg:size-8' />,
      title: t('concept_it_1'),
      text: t('concept_ip_1'),
      image: '/images/concept-1.svg',
      imageText: t('concept_ip_1_text'),
    },
    {
      icon: <Image src='/images/lock-icon.svg' alt='concept-icon' width={32} height={32} className='object-cover size-5 lg:size-8' />,
      title: t('concept_it_2'),
      text: t('concept_ip_2'),
      image: '/images/concept-2.svg',
      imageText: t('concept_ip_2_text'),
    },
    {
      icon: <PiCalendarDots className='size-5 lg:size-8' />,
      title: t('concept_it_3'),
      text: t('concept_ip_3'),
      image: '/images/concept-3.svg',
      imageText: t('concept_ip_3_text'),
    },
    {
      icon: <PiChatTeardropTextLight className='size-5 lg:size-8' />,
      title: t('concept_it_4'),
      text: t('concept_ip_4'),
      image: '/images/concept-4.svg',
      imageText: t('concept_ip_4_text'),
    },
  ]

  return (
    <div id="concept" className='w-full flex flex-col container px-4 xl:px-[100px]  mb-5 lg:mb-0 lg:py-20'>
      <Header title={t('concept_title')} />
      <div className='hidden md:block bg-[#F4F4F4] rounded-[20px] px-7 py-6 mb-5 lg:mb-10'>
        <p className='text-mute mb-2'>
          <b>{t('concept_h_1')}</b> {t('concept_p_1')}
        </p>
        <p className='text-mute'>
          <b>{t('concept_h_2')}</b> and <b>{t('concept_h_2_1')}</b>{t('concept_p_2')}
        </p>
      </div>
      <MobileConcept items={conceptItems} title={t('concept_mobile_title')} />
      <div className='hidden lg:grid grid-cols-[53fr_47fr] gap-5 pb-30 border-b border-[#E0E0E0] '>
        <ConceptList items={conceptItems} onActiveIndexChange={handleActiveIndexChange} />
        <ConceptSlider items={conceptItems} activeIndex={activeIndex} height={500} />
      </div>
      <div className='border-b w-full mt-5 lg:hidden'/>
    </div>
  )
}

export default ConceptSection
