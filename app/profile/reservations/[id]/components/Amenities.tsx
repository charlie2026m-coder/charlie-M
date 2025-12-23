'use client'
import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/app/_components/ui/button'
import DetailsDialog from '@/app/rooms/components/DetailsDialog'
import { amenities } from '@/content/content'

const Amenities = ({  }: { }) => {
  const [showAll, setShowAll] = useState(false)
  
  const ITEMS_TO_SHOW = 9
  const hasMore = amenities.length > ITEMS_TO_SHOW
  const displayedAmenities = showAll ? amenities : amenities.slice(0, ITEMS_TO_SHOW)

  return (
    <div className='flex flex-col'>
      <h3 className=' font-semibold pb-2 border-b mb-4'>Amenities:</h3>
      <div className={cn(
        'flex flex-wrap gap-2.5 transition-all duration-300 ease-in-out overflow-hidden ',
         'max-h-[2000px] opacity-100'
      )}>
        {displayedAmenities.map((amenity) => (
          <AmenityButton key={amenity.title} item={amenity} />
        )) }
      </div>
      
      {hasMore && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className='text-blue hover:text-blue/80 transition-colors text-sm  mt-5 self-start font-bold cursor-pointer'
        >
          {showAll ? 'Show less' : `Show more`}
        </button>
      )}
    </div>
  )
}

const AmenityButton = ({ item }: { item: {
  title: string;
  icon: string;
  imageUrl: string;
  description: string;

} }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button className='flex items-center bg-blue/40 rounded-full px-2.5 group !h-7 items-center gap-1' onClick={() => setIsOpen(!isOpen)}>
        <Image className='size-4' src={item.icon} alt={item.title} width={15} height={15} />
        <span className='text-xs'>{item.title}</span>
      </Button>
      <DetailsDialog title={item.title} image={item.imageUrl} description={item.description} open={isOpen} setOpen={setIsOpen} />
    </>
  )
}

export default Amenities
