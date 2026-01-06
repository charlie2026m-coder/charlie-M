'use client'
import Section from "../components/Section";
import Menu from "../components/Menu";
import { useState, useEffect, useRef } from "react";
import { termsAndConditions } from "@/content/terms-and-conditions";  

export default function Content() {
  const content = termsAndConditions.en.content
  const [activeSection, setActiveSection] = useState<string>(getSectionId(content[0].title))
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isUserScrollingRef.current) {
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
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const handleScrollToSection = (title: string) => {
    const sectionId = getSectionId(title)
    
    // Сразу обновляем активную секцию (для ползунка)
    setActiveSection(sectionId)
    
    // Блокируем IntersectionObserver
    isUserScrollingRef.current = true
    
    // Прокручиваем к элементу с плавной анимацией
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 100 // отступ сверху
      const elementPosition = element.getBoundingClientRect().top
      const startPosition = window.pageYOffset
      const targetPosition = elementPosition + startPosition - offset
      const distance = targetPosition - startPosition
      const duration = 800 // длительность анимации в мс
      let startTime: number | null = null

      // Easing функция для плавности (ease-in-out)
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      const animation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime
        const timeElapsed = currentTime - startTime
        const progress = Math.min(timeElapsed / duration, 1)
        const ease = easeInOutCubic(progress)
        
        window.scrollTo(0, startPosition + distance * ease)

        if (progress < 1) {
          requestAnimationFrame(animation)
        }
      }

      requestAnimationFrame(animation)
    }

    // Через 1 секунду разблокируем IntersectionObserver
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false
    }, 1000)
  }
  
  return (

      <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-9">
        <div className="col-span-1 lg:col-span-2">
          {content.map((item, index) => (
            <Section 
              index={index}
              key={index}
              id={getSectionId(item.title)}
              title={item.title}
              paragraphs={item.paragraphs}
            />
          ))}
        </div>
        <div className="col-span-1 ">
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

