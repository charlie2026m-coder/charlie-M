'use client'
import Image from 'next/image'
import { useState } from 'react'
import { IoIosArrowUp } from 'react-icons/io'
import { IoIosArrowDown } from 'react-icons/io'
import { cn } from '@/lib/utils'
import { Button } from '@/app/_components/ui/button'
import { useTranslations } from 'next-intl'
import { amenities } from '@/content/content'
const icon = 'text-mute size-6'

const Amenities = ({ isTitle = true }: { isTitle?: boolean }) => {
  const [isOpen, setIsOpen] = useState(true)
  const t = useTranslations('amenities')

  return (
    <div className='flex flex-col'>
      {isTitle && <h2 className='text-xl font-semibold text-mute inter mb-5 flex items-center cursor-pointer gap-3' onClick={() => setIsOpen(!isOpen)}>
        {t('title')}
        {isOpen ? <IoIosArrowUp className={icon} /> : <IoIosArrowDown className={icon} />}
      </h2>}
      <div className={cn(
        'flex flex-wrap gap-2.5 transition-all duration-300 ease-in-out overflow-hidden ',
        isOpen ? 'max-h-[2000px] opacity-100 mb-[30px]' : 'max-h-0 opacity-0'
      )}>
        {amenities.map((amenity) => (
          <AmenityButton key={amenity.key} item={amenity} />
        )) }
      </div>
    </div>
  )
}

const AmenityButton = ({ item }: { item: {
  key: string;
  icon: string;
} }) => {
  const t = useTranslations('amenities')
  const title = t(item.key as any)

  return (
      <div 
        className='flex items-center bg-blue/40 rounded-full px-2.5 !h-7 items-center gap-1' 
      >
        <Image className='size-[15px]' src={item.icon} alt={title} width={15} height={15} />
        <span className=''>{title}</span>
      </div>
  )
}

export default Amenities
