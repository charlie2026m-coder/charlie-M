'use client'
import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { amenities } from '@/content/content'
import { useTranslations } from 'next-intl'

const Amenities = ({  }: { }) => {
  const [showAll, setShowAll] = useState(false)
  const t = useTranslations('amenities')
  const tProfile = useTranslations('profile')
  
  const ITEMS_TO_SHOW = 9
  const hasMore = amenities.length > ITEMS_TO_SHOW
  const displayedAmenities = showAll ? amenities : amenities.slice(0, ITEMS_TO_SHOW)

  return (
    <div className='flex flex-col'>
      <h3 className=' font-semibold pb-2 border-b mb-4'>{t('title')}:</h3>
      <div className={cn(
        'flex flex-wrap gap-2.5 transition-all duration-300 ease-in-out overflow-hidden ',
         'max-h-[2000px] opacity-100'
      )}>
        {displayedAmenities.map((amenity) => (
          <AmenityButton key={amenity.key} item={amenity} />
        )) }
      </div>
      
      {hasMore && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className='text-blue hover:text-blue/80 transition-colors text-sm  mt-5 self-start font-bold cursor-pointer'
        >
          {showAll ? tProfile('showLess') : tProfile('showMore')}
        </button>
      )}
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
      <div className='flex items-center bg-blue/40 rounded-full px-2.5 group !h-7 items-center gap-1' >
        <Image className='size-4' src={item.icon} alt={title} width={15} height={15} />
        <span className='text-xs'>{title}</span>
      </div>
  )
}

export default Amenities