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

const ConceptSection = () => {
  const t = useTranslations('home')
  const [activeIndex, setActiveIndex] = useState(0)
  
  const handleActiveIndexChange = useCallback((index: number) => {
    console.log('ConceptSection received index:', index)
    setActiveIndex(index)
  }, [])

  const conceptItems = [
    {
      icon: <BsCheck2Circle className='size-8' />,
      title: t('concept_it_1'),
      text: t('concept_ip_1'),
      image: '/images/location-2.svg',
      imageText: t('concept_ip_1_text'),
    },
    {
      icon: <Image src='/images/lock-icon.svg' alt='concept-icon' width={32} height={32} className='object-cover size-8' />,
      title: t('concept_it_2'),
      text: t('concept_ip_2'),
      image: '/images/location-3.svg',
      imageText: t('concept_ip_2_text'),
    },
    {
      icon: <PiCalendarDots className='size-8' />,
      title: t('concept_it_3'),
      text: t('concept_ip_3'),
      image: '/images/location-4.svg',
      imageText: t('concept_ip_3_text'),
    },
    {
      icon: <PiChatTeardropTextLight className='size-8' />,
      title: t('concept_it_4'),
      text: t('concept_ip_4'),
      image: '/images/location-5.svg',
      imageText: t('concept_ip_4_text'),
    },
  ]

  return (
    <div id="concept" className='w-full flex flex-col container px-4 xl:px-[100px]'>
      <Header title={t('concept_title')} />
      <div className='bg-[#F4F4F4] rounded-[20px] px-7 py-6 mb-10'>
        <p className='text-mute mb-2'>
          <b>{t('concept_h_1')}</b> {t('concept_p_1')}
        </p>
        <p className='text-mute'>
          <b>{t('concept_h_2')}</b> and <b>{t('concept_h_2_1')}</b>{t('concept_p_2')}
        </p>
      </div>
      <div className='grid grid-cols-[53fr_47fr] gap-5 pb-30 border-b border-[#E0E0E0] '>
        <ConceptList items={conceptItems} onActiveIndexChange={handleActiveIndexChange} />
        <ConceptSlider items={conceptItems} activeIndex={activeIndex} height={578} />
      </div>
    </div>
  )
}

export default ConceptSection
