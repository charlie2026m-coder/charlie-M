'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface ExpItem {
  icon: React.ReactNode
  title: string
  text: string
}

interface ExpListProps {
  items: ExpItem[]
  onActiveIndexChange?: (index: number) => void
}

export default function ExpList({ items, onActiveIndexChange }: ExpListProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [arrowPosition, setArrowPosition] = useState({ top: 0, opacity: 0 })
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index)
    onActiveIndexChange?.(index)
  }

  useEffect(() => {
    if (itemRefs.current[activeIndex] && containerRef.current) {
      const itemRect = itemRefs.current[activeIndex]!.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeTop = itemRect.top - containerRect.top + itemRect.height / 2
      
      setArrowPosition({
        top: relativeTop,
        opacity: 1
      })
    }
  }, [activeIndex])

  useEffect(() => {
    if (itemRefs.current[0] && containerRef.current) {
      const itemRect = itemRefs.current[0].getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeTop = itemRect.top - containerRect.top + itemRect.height / 2
      
      setTimeout(() => {
        setArrowPosition({
          top: relativeTop,
          opacity: 1
        })
      }, 100)
    }
  }, [])

  return (
    <div className='flex flex-col border-l-2 border-blue'>
      <h3 className='text-[40px] font-[500] text-mute mb-5 pl-8'>
        Charlie M Experience
      </h3>
      <div ref={containerRef} className='flex flex-col gap-5 relative'> 
        <div 
          className='absolute -left-0.5  -translate-y-1/2 transition-all duration-500 ease-out'
          style={{
            top: `${arrowPosition.top}px`,
            opacity: arrowPosition.opacity
          }}
        >
          <Image src='/images/chevron-left.svg' alt='arrow-left' width={12} height={35} className='rotate-180' />
        </div>

        {items.map((item, index) => (
          <div 
            key={item.title}
            ref={(el) => { itemRefs.current[index] = el }}
            onMouseEnter={() => handleMouseEnter(index)}
            className={`flex items-center p-5 gap-4 rounded-[20px] transition-all duration-300 ml-8 ${
              activeIndex === index ? 'bg-[#F7F5F2]' : 'hover:bg-[#F7F5F2]'
            }`}
          >
            <div className="size-[70px] rounded-full border border-blue flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className='flex flex-col'>
              <h4 className='text-[24px] font-bold text-mute'>{item.title}</h4>
              <p className='text-sm text-mute'>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

