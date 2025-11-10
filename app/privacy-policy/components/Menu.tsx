import React from 'react'

interface MenuProps {
  sections: string[]
  activeSection: string
  onSectionClick: (title: string) => void
}

export default function Menu({ sections, activeSection, onSectionClick }: MenuProps) {
  const getSectionId = (title: string): string => {
    return title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
  }

  const activeIndex = sections.findIndex(title => getSectionId(title) === activeSection)
  
  const itemHeight = 44
  const translateY = activeIndex * itemHeight

  return (
    <div className='bg-white rounded-[20px] p-6 flex flex-stretch gap-6 shadow-lg sticky top-10 relative gap-6'>
      <div className='relative bg-brown/20 rounded-full !w-[4px] '>
        <div 
          className='absolute top-0 w-full left-0 h-[44px] bg-brown rounded-full transition-transform duration-300 ease-in-out' 
          style={{ transform: `translateY(${translateY}px)` }} 
        />
      </div>
      
      <div className='flex flex-col '>
        {sections.map((title) => {
          const sectionId = getSectionId(title)
          const isActive = activeSection === sectionId
          
          return (
            <button
              key={title}
              onClick={() => onSectionClick(title)}
              className={`cursor-pointer py-3 text-left text-sm inter font-normal pl-4 transition-all duration-200 relative z-10 hover:underline`}
            >
              {title}
            </button>
          )
        })}
      </div>

      </div>
  )
}