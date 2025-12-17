'use client'
import Image from 'next/image'
import { useState } from 'react'
import { IoIosArrowUp } from 'react-icons/io'
import { IoIosArrowDown } from 'react-icons/io'
import { cn } from '@/lib/utils'
import { Button } from '@/app/_components/ui/button'
import DetailsDialog from './DetailsDialog'

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
const amenities = [
  { 
    title: 'Kettle',  
    icon: '/images/amenities/kettle.webp',
    imageUrl: '/images/location-1.png',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' 
  },
  { 
    title: 'Coffee machine',  
    icon: '/images/amenities/coffee.webp',
    imageUrl: '/images/amenities/coffee.webp',
    description: 'Coffee machine' 
  },
  { 
    title: 'Fresh towels & bed linen',  
    icon: '/images/amenities/towels.webp',
    imageUrl: '/images/amenities/towels.webp',
    description: 'Fresh towels & bed linen' 
  },
  { 
    title: 'Mini Fridge',  
    icon: '/images/amenities/mini_fridge.webp',
    imageUrl: '/images/amenities/mini_fridge.webp',
    description: 'Mini Fridge' 
  },
  { 
    title: 'Hairdryer',  
    icon: '/images/amenities/hairdryer.webp',
    imageUrl: '/images/amenities/hairdryer.webp',
      description: 'Hairdryer' 
    },
    { 
    title: 'Smart TV',  
    icon: '/images/amenities/tv.webp',
    imageUrl: '/images/amenities/tv.webp',
    description: 'Smart TV' 
  },
  { 
    title: 'Hight-speed Wi-Fi',  
    icon: '/images/amenities/wifi.webp',
    imageUrl: '/images/amenities/wifi.webp',
    description: 'Hight-speed Wi-Fi' 
  },
  { 
    title: 'Air Conditioning',  
    icon: '/images/amenities/air.webp',
    imageUrl: '/images/amenities/air.webp',
    description: 'Air Conditioning' 
  },
  { 
    title: 'Blackout curtains',  
    icon: '/images/amenities/curtains.webp',
    imageUrl: '/images/amenities/curtains.webp',
    description: 'Blackout curtains' 
  },
  { 
    title: 'Self- Service Closet',  
    icon: '/images/amenities/closets.webp',
    imageUrl: '/images/amenities/closets.webp',
    description: 'Self- Service Closet' 
  },
  { 
    title: 'Elevator',  
    icon: '/images/amenities/elevator.webp',
    imageUrl: '/images/amenities/elevator.webp',
    description: 'Elevator' 
  },
  { 
    title: 'Weekly cleaning (for stays of 7+ nights)',  
    icon: '/images/amenities/cleaning.webp',
    imageUrl: '/images/amenities/cleaning.webp',
    description: 'Weekly cleaning (for stays of 7+ nights)' 
  },
  { 
    title: 'Luggage Storage',  
    icon: '/images/amenities/storage.webp',
    imageUrl: '/images/amenities/storage.webp',
    description: 'Luggage Storage' 
  },
  { 
    title: 'Bicycle parking',  
    icon: '/images/amenities/cycle-parking.webp',
    imageUrl: '/images/amenities/cycle-parking.webp',
    description: 'Bicycle parking' 
  },
  { 
    title: 'Community area with co-working space ',  
    icon: '/images/amenities/co-working.webp',
    imageUrl: '/images/amenities/co-working.webp',
    description: 'Community area with co-working space ' 
  },
  { 
    title: 'Virtual concierge “Charlie” available 24/7',  
    icon: '/images/amenities/service.webp',
    imageUrl: '/images/amenities/service.webp',
    description: 'Virtual concierge “Charlie” available 24/7' 
  },
]