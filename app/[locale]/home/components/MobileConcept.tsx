'use client'
import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
const MobileConcept = ({
  items,
  title
}:{
  items: {
    icon: React.ReactNode
    title: string
    text: string
    image: string
    imageText: string
  }[]
  title: string
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)


  return (
    <div className="flex lg:hidden flex-col gap-2.5">
      {items.map((item, index) => (
        <div key={item.title} className={cn("flex flex-col p-2.5 border rounded-[30px]", openIndex ===index && 'bg-[#F7F5F2] border-[#F7F5F2]' )}>
          <div 
            className='flex gap-2.5 cursor-pointer'
            onClick={() => setOpenIndex(index)}
          >
            <div className="size-10 rounded-full border border-blue flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className='flex flex-col'>
              <h4 className='font-bold text-mute'>{item.title}</h4>
              <p className='text-sm text-mute'>{item.text}</p>
            </div>
          </div>
          <div 
            className='relative w-full rounded-[20px] overflow-hidden transition-all duration-500 ease-out'
            style={{
              height: openIndex === index ? '300px' : '0px',
              marginTop: openIndex === index ? '16px' : '0px',
              opacity: openIndex === index ? 1 : 0
            }}
          >
            <Image 
              src={item.image} 
              alt={title} 
              fill
              className="object-cover object-top"
            />
            <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
            <div className='absolute bottom-0 left-0 right-0 p-4 text-white z-10'>
              <p className='text-[20px] text-[#F7F5F2]'>{item.imageText}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MobileConcept