'use client'
import Image from 'next/image'
import { useState } from 'react'
import { IoIosArrowUp } from 'react-icons/io'
import { IoIosArrowDown } from 'react-icons/io'
import { cn } from '@/lib/utils'
import { Button } from '@/app/_components/ui/button'
import DetailsDialog from './DetailsDialog'
import { amenities } from '@/content/content'

const Amenities = ({ isTitle = true }: { isTitle?: boolean }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className='flex flex-col'>
      {isTitle && <h2 className='text-xl font-semibold text-mute inter mb-5 flex items-center cursor-pointer gap-3' onClick={() => setIsOpen(!isOpen)}>
        Amenities included
        {isOpen ? <IoIosArrowUp className={icon} /> : <IoIosArrowDown className={icon} />}
      </h2>}
      <div className={cn(
        'flex flex-wrap gap-2.5 transition-all duration-300 ease-in-out overflow-hidden ',
        isOpen ? 'max-h-[2000px] opacity-100 mb-[30px]' : 'max-h-0 opacity-0'
      )}>
        {amenities.map((amenity) => (
          <AmenityButton key={amenity.title} item={amenity} />
        )) }
      </div>
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
        <Image className='size-[15px]' src={item.icon} alt={item.title} width={15} height={15} />
        <span className=''>{item.title}</span>
      </Button>
      <DetailsDialog title={item.title} image={item.imageUrl} description={item.description} open={isOpen} setOpen={setIsOpen} />
    </>
  )
}

export default Amenities
const icon = 'text-mute size-6'
