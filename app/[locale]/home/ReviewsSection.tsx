'use client'
import Header from "./components/Header"
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'
import Image from "next/image"

const ReviewsSection = () => {

  return (
    <div className='flex flex-col container px-4 xl:px-[100px] py-20 '>
      <Header title='What Our Guests Say' />

      <div className="mt-20">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={16}
          slidesPerView={3}
          speed={1500}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          loop={true}
          className="reviews-swiper"
        >
          {items.map((item, index) => (
            <SwiperSlide key={`${item.name}-${index}`} style={{ height: 'auto' }}>
              <div className="flex flex-col gap-4 rounded-[40px] bg-[#F4F4F4] px-5 py-8 h-full">
                <Image src='/images/icons/comas-icon.svg' alt={item.name} width={74} height={74} className="object-cover size-[74px]" />
                <p className="text-mute inter  mb-7">{item.review}</p>
                <p className="text-mute italic text-end font-bold mt-auto">{item.name}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

    </div>
  )
}

export default ReviewsSection


const items =[
  {
    name: 'Sarah Mitchell',
    review: 'Absolutely stunning hotel! The rooms are spacious and beautifully designed. The staff went above and beyond to make our stay memorable. The breakfast buffet was incredible with so many options. Will definitely be returning!',
  },
  {
    name: 'Michael Chen',
    review: 'Great location in the heart of the city. The room was clean and comfortable, though a bit smaller than expected. The concierge service was very helpful with restaurant recommendations. Overall a pleasant stay.',
  },
  {
    name: 'Emma Thompson',
    review: 'Perfect weekend getaway! The spa facilities are top-notch and the rooftop bar has amazing views. The bed was incredibly comfortable - best sleep I\'ve had in ages. Highly recommend the deluxe suite!',
  },
  {
    name: 'David Rodriguez',
    review: 'The hotel has a modern, elegant design. Service was professional and efficient. Only minor issue was the WiFi being a bit slow in our room, but it was manageable. Great value for money.',
  },
  {
    name: 'Olivia Williams',
    review: 'Exceeded all expectations! From the moment we arrived, the staff made us feel special. The room had a beautiful view and was spotlessly clean. The restaurant serves delicious food. Can\'t wait to come back!',
  },
  {
    name: 'James Anderson',
    review: 'Absolutely stunning hotel! The rooms are spacious and beautifully designed. The staff went above and beyond to make our stay memorable. The breakfast buffet was incredible with so many options. Will definitely be returning!',
  },
  {
    name: 'Sophie Martin',
    review: 'Luxurious experience from start to finish! The attention to detail is impressive - fresh flowers in the room, turn-down service, premium toiletries. The location is perfect for exploring the city. Worth every penny!',
  },
  {
    name: 'Robert Taylor',
    review: 'Comfortable stay for business travel. The conference facilities are excellent and the business center is well-equipped. Staff was accommodating with early check-in. Good selection of restaurants nearby.',
  },
  {
    name: 'Isabella Garcia',
    review: 'Beautiful hotel with incredible architecture. The lobby is breathtaking and the rooms are tastefully decorated. The spa treatments were relaxing. Only wish we could have stayed longer!',
  },
  {
    name: 'Thomas Brown',
    review: 'Solid hotel experience. Clean rooms, friendly staff, and good location. The breakfast was decent but could use more variety. Parking was convenient. Would stay here again for the price point.',
  },
  {
    name: 'Charlotte Davis',
    review: 'Absolutely loved our stay! The hotel has a unique charm and character. The staff remembered our names and preferences. The room was spacious with a lovely balcony. Perfect romantic getaway destination!',
  },
]