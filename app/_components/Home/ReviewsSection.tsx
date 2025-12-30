'use client'
import { useState, useEffect } from 'react'
import { FaStar } from "react-icons/fa";
import { Separator } from "../ui/separator";
import { reviews } from '@/content/content'
import type { CarouselApi } from '../ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../ui/carousel'

const ReviewsSection = () => {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [reviewsPerSlide, setReviewsPerSlide] = useState(3)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      let newCount = 3
      
      if (width < 768) {
        newCount = 1 // Mobile: 1 card per slide
      } else if (width < 1024) {
        newCount = 2 // Tablet: 2 cards per slide
      } else {
        newCount = 3 // Desktop: 3 cards per slide
      }
      
      setReviewsPerSlide(newCount)
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Track carousel state
  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  // Split reviews into slides
  const slides = []
  for (let i = 0; i < reviews.length; i += reviewsPerSlide) {
    slides.push(reviews.slice(i, i + reviewsPerSlide))
  }

  return (
    <div className='w-full bg-light1'>
      <div className='container px-4 lg:px-[100px] pt-[50px] pb-10'>
        <div className='flex items-center gap-2 mb-10'>
          <h2 className='font-medium text-[40px]'>Reviews</h2>
        </div>

        <Carousel 
          className="w-full" 
          setApi={setApi}
          opts={{
            loop: false,
            align: 'start',
          }}
        >
          <CarouselContent>
            {slides.map((slideReviews, slideIndex) => (
              <CarouselItem key={slideIndex}>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {slideReviews.map((review, index) => (
                    <div 
                      key={index} 
                      className='flex flex-col p-6 gap-4 bg-white rounded-3xl min-h-[250px]'
                    >
                      <div className="flex flex-col gap-4">
                        <div className='flex items-center gap-2 text-xl font-semibold'>
                          <h3>{review.name}</h3>
                          <FaStar className='text-yellow-400 ml-auto mr-1' />
                          {review.rating}/5
                        </div> 
                        <Separator orientation="horizontal" /> 
                        <p className='text-sm'>{review.review}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-[6px] mt-10">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                index === current ? 'bg-brown' : 'bg-white/50'
              }`}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to review set ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReviewsSection
