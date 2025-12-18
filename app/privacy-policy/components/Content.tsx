'use client'
import Section from "../components/Section";
import Menu from "../components/Menu";
import { useState, useEffect } from "react";
import { materials } from "../../../content/content";

export default function Content({type}:{ type: 'privacyPolicy' | 'termsAndConditions'}) {
  const [activeSection, setActiveSection] = useState<string>('introduction')
  const content = materials[type].content

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

    content.forEach((item) => {
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

      <div className="flex flex-col-reverse md:grid md:grid-cols-4 gap-9">
        <div className="col-span-2 lg:col-span-3">
          {content.map((item, index) => (
            <Section 
              key={index}
              id={getSectionId(item.title)}
              title={item.title}
              paragraphs={item.paragraphs}
            />
          ))}
        </div>
        <div className="col-span-2 lg:col-span-1">
          <Menu 
            sections={content.map(item => item.title)}
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

