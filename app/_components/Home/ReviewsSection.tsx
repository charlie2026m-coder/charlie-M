'use client'
import { useState, useCallback, useEffect } from 'react'
import { FaStar } from "react-icons/fa";
import { Separator } from "../ui/separator";

const ReviewsSection = () => {
  const [currentSet, setCurrentSet] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [reviewsPerSet, setReviewsPerSet] = useState(3)

  // Adjust cards per set based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      let newCount = 3
      
      if (width < 768) {
        newCount = 1 // Mobile: 1 column, 1 card
      } else if (width < 1024) {
        newCount = 2 // Tablet: 2 columns, 4 cards
      } else {
        newCount = 3 // Desktop: 3 columns, 6 cards
      }
      
      setReviewsPerSet(newCount)
      setCurrentSet(0) // Reset to first set when screen size changes
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const totalSets = Math.ceil(reviews.length / reviewsPerSet)
  const currentReviews = reviews.slice(
    currentSet * reviewsPerSet,
    (currentSet + 1) * reviewsPerSet
  )

  const handleSetChange = useCallback((newSet: number) => {
    setIsTransitioning(true)
    const fadeOutDuration = 500 + (reviewsPerSet - 1) * 15
    setTimeout(() => {
      setCurrentSet(newSet)
      setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
    }, fadeOutDuration)
  }, [reviewsPerSet])

  return (
    <div className='w-full bg-light1'>
      <div className='container px-4 lg:px-[100px] pt-[50px] pb-10'>
        <div className='flex items-center gap-2 mb-10'>
          <h2 className='font-medium text-[40px]'>Reviews</h2>
        </div>

        <div className='relative '>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {Array.from({ length: reviewsPerSet }).map((_, index) => {
              const review = currentReviews[index]
              if (!review) return null
              
              const delay = index * 15
              return (
                <div 
                  key={index} 
                  className='flex flex-col p-6 gap-4 bg-white rounded-3xl min-h-[250px]'
                >
                  <div
                    style={{
                      opacity: isTransitioning ? 0 : 1,
                      transition: `opacity 500ms ease-in-out ${delay}ms`
                    }}
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
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-[6px] mt-10">
          {Array.from({ length: totalSets }).map((_, index) => (
            <button
              key={index}
              className={`size-[10px] rounded-full transition-colors duration-500 ease-in-out cursor-pointer ${
                index === currentSet ? 'bg-brown' : 'bg-white/50'
              }`}
              onClick={() => handleSetChange(index)}
              aria-label={`Go to review set ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReviewsSection

const reviews = [
  {
    name: 'Sarah Mitchell',
    review: 'Absolutely stunning hotel! The rooms are spacious and beautifully designed. The staff went above and beyond to make our stay memorable. The breakfast buffet was incredible with so many options. Will definitely be returning!',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    review: 'Great location in the heart of the city. The room was clean and comfortable, though a bit smaller than expected. The concierge service was very helpful with restaurant recommendations. Overall a pleasant stay.',
    rating: 4,
  },
  {
    name: 'Emma Thompson',
    review: 'Perfect weekend getaway! The spa facilities are top-notch and the rooftop bar has amazing views. The bed was incredibly comfortable - best sleep I\'ve had in ages. Highly recommend the deluxe suite!',
    rating: 5,
  },
  {
    name: 'David Rodriguez',
    review: 'The hotel has a modern, elegant design. Service was professional and efficient. Only minor issue was the WiFi being a bit slow in our room, but it was manageable. Great value for money.',
    rating: 4,
  },
  {
    name: 'Olivia Williams',
    review: 'Exceeded all expectations! From the moment we arrived, the staff made us feel special. The room had a beautiful view and was spotlessly clean. The restaurant serves delicious food. Can\'t wait to come back!',
    rating: 5,
  },
  {
    name: 'James Anderson',
    review: 'Nice hotel with good amenities. The gym is well-equipped and the pool area is relaxing. Room service was prompt. The only downside was some noise from the street, but earplugs helped.',
    rating: 4,
  },
  {
    name: 'Sophie Martin',
    review: 'Luxurious experience from start to finish! The attention to detail is impressive - fresh flowers in the room, turn-down service, premium toiletries. The location is perfect for exploring the city. Worth every penny!',
    rating: 5,
  },
  {
    name: 'Robert Taylor',
    review: 'Comfortable stay for business travel. The conference facilities are excellent and the business center is well-equipped. Staff was accommodating with early check-in. Good selection of restaurants nearby.',
    rating: 4,
  },
  {
    name: 'Isabella Garcia',
    review: 'Beautiful hotel with incredible architecture. The lobby is breathtaking and the rooms are tastefully decorated. The spa treatments were relaxing. Only wish we could have stayed longer!',
    rating: 5,
  },
  {
    name: 'Thomas Brown',
    review: 'Solid hotel experience. Clean rooms, friendly staff, and good location. The breakfast was decent but could use more variety. Parking was convenient. Would stay here again for the price point.',
    rating: 4,
  },
  {
    name: 'Charlotte Davis',
    review: 'Absolutely loved our stay! The hotel has a unique charm and character. The staff remembered our names and preferences. The room was spacious with a lovely balcony. Perfect romantic getaway destination!',
    rating: 5,
  },
  {
    name: 'Daniel Wilson',
    review: 'Good hotel overall. The facilities are modern and well-maintained. The bar has a nice atmosphere in the evenings. Room was comfortable but the air conditioning was a bit noisy. Still a pleasant stay.',
    rating: 3,
  },
  {
    name: 'Amelia Moore',
    review: 'Exceptional service and beautiful accommodations! Every detail was perfect - from the welcome drink to the personalized note in our room. The rooftop pool is a must-visit. Truly a five-star experience!',
    rating: 5,
  },
  {
    name: 'Christopher Lee',
    review: 'Nice hotel with great amenities. The fitness center is impressive and the pool area is well-designed. Staff was helpful with local recommendations. Room was clean and comfortable. Good value.',
    rating: 4,
  },

] 