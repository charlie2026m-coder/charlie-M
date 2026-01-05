'use client'
import FAQCard from '@/app/_components/Home/FAQCard'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { FAQSectons } from '@/content/content'
const FAQ = ({
  activeFAQ,
  setActiveFAQ,
  image
}: {
  activeFAQ: number
  setActiveFAQ: (activeFAQ: number) => void
  image: string
}) => {
  const [activeTab, setActiveTab] = useState(0)
  return (
      <div className='gap-2 flex flex-col '>
        <div className='grid grid-cols-2 xl:grid-cols-3 justify-between mb-10 gap-6'>
          {FAQSectons.map((item, index) => 
            <div
              className={cn('flex items-center justify-center rounded-full py-2.5 text-center border border-mute text-mute cursor-pointer transition-all duration-300 ', activeFAQ === item.id ? 'bg-mute text-white border-mute' : 'border border-mute text-mute')} 
              onClick={() => {
                setActiveFAQ(item.id)
                setActiveTab(0)
              } }
              key={item.title}
            >{item.title}</div>
          )}
        </div>
        <Image src={image} alt='faq' width={610} height={512} className='lg:hidden  w-full max-h-[280px] rounded-[40px] object-contain ' />

        <div className='flex flex-col gap-5 '>
          {FAQSectons.filter((item) => item.id === activeFAQ)[0].items.map((item, index) => (
            <FAQCard 
              key={item.title} 
              index={index} 
                active={activeTab === index} 
                setActiveTab={setActiveTab} 
                question={item.title} 
                items={item.p} 
              />
            ))}
        </div>
      </div>
  )
}

export default FAQ

