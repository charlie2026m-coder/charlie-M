'use client'

import { useEffect, useState } from 'react'
import Header from './components/Header'

const InstagramSection = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Check if script is already loaded
    if (document.getElementById('TagEmbedScript')) {
      setIsLoaded(true)
      return
    }

    // Create and load the TagEmbed script
    const script = document.createElement('script')
    script.id = 'TagEmbedScript'
    script.src = 'https://widget.tagembed.com/embed.min.js'
    script.type = 'text/javascript'
    script.async = true
    
    // Handle script load success
    script.onload = () => {
      setIsLoaded(true)
      // Check if widget content loaded after a delay
      setTimeout(() => {
        const widgetContent = document.querySelector('.tagembed-widget .splide__slide')
        if (!widgetContent) {
          setHasError(true)
        }
      }, 3000)
    }
    
    // Handle script load error
    script.onerror = () => {
      setHasError(true)
    }
    
    document.head.appendChild(script)

    // Cleanup function to remove script on unmount (optional)
    return () => {
      const existingScript = document.getElementById('TagEmbedScript')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  useEffect(() => {
    // Add styles to customize Splide arrows
    const styleId = 'tagembed-arrow-style'
    if (document.getElementById(styleId)) {
      return
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .splide__arrow,
      .splide__arrow--next,
      .splide__arrow--prev {
        display: none !important;
      }
      
      /* Mobile layout: one photo on top, two photos in row below */
      @media (max-width: 767px) {
        .tb_cst_author_wrapper {
          display: none !important;
        }
        
        .tb_cst_post_wrapper {
          padding: 4px !important;
        }
        
        .splide__slide.ts_cst_post_row {
          display: flex !important;
          flex-direction: column !important;
        }
        
        .splide__slide.ts_cst_post_row .ts_cst_wrap_single {
          width: 100% !important;
          order: 1 !important;
          margin-bottom: 8px !important;
          overflow: hidden !important;
        }
        
        .splide__slide.ts_cst_post_row .ts_cst_wrap_multi {
          width: 100% !important;
          order: 2 !important;
          display: flex !important;
          flex-direction: row !important;
          gap: 8px !important;
          overflow: visible !important;
        }
        
        .splide__slide.ts_cst_post_row .ts_cst_wrap_multi .small-image {
          flex: 1 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        
        .small-image {
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        
        .small-image img,
        .ts_cst_wrap_single img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  // Don't render section if widget failed to load
  if (hasError) {
    return null
  }

  return (
    <div className='flex flex-col container px-4 xl:px-[100px]  py-6 md:py-20'>
      <Header title='Follow Us' />
      <h3 className='py-4 px-5 bg-[#F7F5F2] rounded-[20px] text-2xl md:text-[33px] font-bold self-center text-dark mb-4 md:mb-10'>#SleepWithCharlieM</h3>

      <div 
        className="tagembed-widget" 
        style={{ width: '100%', height: '100%', overflow: 'auto' }}
        data-widget-id="316094"
        data-website="1"
      />
    </div>
  )
}

export default InstagramSection