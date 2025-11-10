'use client'
import Section from "../components/Section";
import Menu from "../components/Menu";
import { useState, useEffect } from "react";
import { materials } from "../../../materials/materials";

export default function Content() {
  const [activeSection, setActiveSection] = useState<string>('introduction')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    )

    materials.termsAndConditions.content.forEach((item) => {
      const element = document.getElementById(getSectionId(item.title))
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleScrollToSection = (title: string) => {
    const sectionId = getSectionId(title)
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 100 // отступ сверху
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }
  
  return (

      <div className="grid grid-cols-4 gap-9">
        <div className="col-span-3">
          {materials.termsAndConditions.content.map((item, index) => (
            <Section 
              key={index}
              id={getSectionId(item.title)}
              title={item.title}
              paragraphs={item.paragraphs}
            />
          ))}
        </div>
        <div className="col-span-1">
          <Menu 
            sections={materials.termsAndConditions.content.map(item => item.title)}
            activeSection={activeSection}
            onSectionClick={handleScrollToSection}
          />
        </div>
      </div>
  )
}

function getSectionId(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

