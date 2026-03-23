import { useRef, useEffect, useState } from 'react'

interface MenuProps {
  sections: string[]
  activeSection: string
  onSectionClick: (title: string) => void
}

export default function Menu({ sections, activeSection, onSectionClick }: MenuProps) {
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [translateY, setTranslateY] = useState(0)
  const [indicatorHeight, setIndicatorHeight] = useState(44)

  const getSectionId = (title: string): string => {
    return title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
  }

  const activeIndex = sections.findIndex(title => getSectionId(title) === activeSection)

  useEffect(() => {
    if (activeIndex >= 0 && itemsRef.current[activeIndex]) {
      const activeElement = itemsRef.current[activeIndex]
      if (activeElement) {
        let calculatedTop = 0
        for (let i = 0; i < activeIndex; i++) {
          if (itemsRef.current[i]) {
            calculatedTop += itemsRef.current[i]!.offsetHeight
          }
        }
        setTranslateY(calculatedTop)
        setIndicatorHeight(activeElement.offsetHeight)
      }
    }
  }, [activeIndex])

  return (
    <div className='bg-white rounded-[20px] p-6 flex flex-stretch gap-6 shadow-lg sticky top-10 relative gap-6'>
      <div className='relative bg-brown/20 rounded-full !w-[4px] '>
        <div 
          className='absolute top-0 w-full left-0 bg-brown rounded-full transition-all duration-300 ease-in-out' 
          style={{ 
            transform: `translateY(${translateY}px)`,
            height: `${indicatorHeight}px`
          }} 
        />
      </div>
      
      <div className='flex flex-col '>
        {sections.map((title, index) => {
          const sectionId = getSectionId(title)
          const isActive = activeSection === sectionId
          
          return (
            <button
              key={title}
              ref={(el) => { itemsRef.current[index] = el }}
              onClick={() => onSectionClick(title)}
              className={`cursor-pointer py-3 text-left text-sm inter pl-4 transition-all duration-200 relative z-10 hover:underline ${
                isActive ? 'font-semibold' : 'font-normal'
              }`}
            >
              {title}
            </button>
          )
        })}
      </div>

      </div>
  )
}