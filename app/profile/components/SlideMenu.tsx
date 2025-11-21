interface SlideMenuProps {
  sections: string[]
  activeSection: string
  onSectionClick: (section: string) => void
}

export default function SlideMenu({ sections, activeSection, onSectionClick }: SlideMenuProps) {
  // Calculate active index
  const activeIndex = sections.indexOf(activeSection)
  
  // Calculate translateY based on button height (44px per button)
  const buttonHeight = 44
  const translateY = activeIndex >= 0 ? activeIndex * buttonHeight : 0

  return (
    <div className='flex gap-5 pl-5'>
      {/* Slider track */}
      <div className='relative bg-brown/20 rounded-full w-[4px]'>
        <div 
          className='absolute top-0 w-full left-0 h-[44px] bg-brown rounded-full transition-transform duration-300 ease-in-out' 
          style={{ transform: `translateY(${translateY}px)` }} 
        />
      </div>
      
      {/* Menu items */}
      <div className='flex flex-col'>
        {sections.map((section) => {
          const isActive = activeSection === section
          
          return (
            <button
              key={section}
              onClick={() => onSectionClick(section)}
              className={`cursor-pointer h-[44px] text-left  inter font-normal transition-all duration-200 relative z-10 hover:text-brown ${
                isActive ? 'text-black font-medium font-[500]' : 'text-black/70'
              }`}
            >
              {section}
            </button>
          )
        })}
      </div>
    </div>
  )
}