'use client'
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog"
import CardContent from './CardContent'

const infoCard = ({ card }: { card: { id: number, title: string, subTitle: string, icon: React.ReactNode } }) => {
  const [open,setOpen] = useState(false)

  const content = cardsContent.find(content => content.id === card.id)
  return (
    <>
      <div key={card.id} onClick={() => setOpen(!open)} className='flex group hover:bg-blue cursor-pointer flex-col items-center md:flex-row px-2 md:px-5 py-10 bg-white items-center  rounded-lg transition-all duration-300 '>
        <div className='flex gap-2 flex-col md:flex-row items-center'>
          <div className='size-[70px] min-w-[70px] group-hover:bg-white rounded-full bg-blue flex items-center self-center justify-center transition-all duration-300'>
            {card.icon}
          </div>
          <div className='flex flex-col gap-1'>
            <h3 className='md:text-2xl font-[500] text-center md:text-start text-mute inter'>{card.title}</h3>
            <p className='md:text-base text-sm text-center md:text-start text-mute inter'>{card.subTitle}</p>
          </div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='rounded-lg px-2 md:px-10 xl:px-25 w-[95%] md:w-4/5 max-w-[900px] max-h-[90vh] md:max-h-[85vh] overflow-y-auto top-[5%] md:top-[50%] translate-y-0 md:translate-y-[-50%]'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-[500] text-mute inter text-center'>{card.title}</DialogTitle>
            <CardContent 
              images={content?.images || []} 
              description={content?.description || []} 
              card1={content?.card1} 
              card2={content?.card2} 
              />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default infoCard


const cardsContent = [
  { 
    id: 1, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'], 
    description: ['A calm, well-lit workspace designed for focus and comfort.','Enjoy a quiet environment, fast WiFi, and a small coffee station that keeps you energized throughout the day.'], 
    card1: ['Comfortable chairs & a proper worktable', 'Fast WiFi', 'Coffee available anytime'], 
    card2: ['Located to the Elevator on the Ground Level', 'Easily accessible throughout the day (Open 24/7)'] 
  },
  { 
    id: 2, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'], 
    description: ['Secure, easy-to-use lockers for early arrivals and late departures — giving you complete freedom to explore without carrying your bags.'], 
    card1: ['Available before check-in and after check-out', 'Fully secure and simple to use'], 
    card2: ['Located on the –1 floor', 'Accessible via elevator or stairs', 'Opens with the same PIN code as your room'] 
  },
  { 
    id: 3, 
    images:  ['/images/room.jpg', '/images/room2.jpg', '/images/room3.jpg'], 
    description: ['Our Self-Service Closet offers fresh towels, toiletries, and essential items whenever you need them — available 24/7 and just a few steps from your room.'], 
    card1: ['Fresh towels', 'Toiletries', 'Room essentials'], 
    card2: ['Located on the –1 floor', 'Accessible via elevator or stairs', 'Opens with the same PIN code as your room'] 
  },
  { 
    id: 4, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'],
    description: ['Our laundry room is available whenever you need to wash or refresh your clothes, equipped with everything you need for a smooth experience.'], 
    card1: ['Modern washers & dryers (extra cost)', 'Iron & ironing board','Drying rack'], 
    card2: ['Located on the –1 floor', 'Accessible via elevator or stairs', 'Opens with the same PIN code as your room'] 
  },
  { 
    id: 5, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'], 
    description: ['Each room includes a coffee machine with complimentary capsules, so you can enjoy a calm moment in the morning or a quick boost before heading out.'], 
    card1: ['Coffee machine ( the brand of coffee machine (do not know yet)', 'Complimentary capsules (same here)'], 
  },
  { 
    id: 6, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'],
    description: ['High-speed WiFi is available throughout the hotel, offering a strong and reliable connection for streaming, video calls, or remote work.'], 
  },
]