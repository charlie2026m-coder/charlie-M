'use client'
import Image from 'next/image'
import { Button } from '../ui/button'
import { FaLocationDot } from "react-icons/fa6";
import { AiOutlineLike } from "react-icons/ai";
import { FaSquareParking } from "react-icons/fa6";
import FAQCard from './FAQCard';
import { useState } from 'react';

const FAQSection = () => {
  const [activeTab, setActiveTab] = useState(0)
  return (
    <div className='w-full grid grid-cols-1 lg:grid-cols-2 container px-4 lg:px-[100px] py-[85px] gap-12 '>
      <div className='col-span-1 flex flex-col'>
        <h2 className='text-[40px] lg:text-6xl font-bold jakarta leading-[1.2] mb-8'>Frequently Asked Questions</h2>
        <Image src='/images/street-1.png' alt='faq' width={576} height={430} className='w-full h-[215px] lg:h-[430px] rounded-[40px] object-cover' />
      </div>
      <div className='col-span-1 flex flex-col justify-between'>
        <div className='grid lg:grid-cols-3 justify-between mb-10 gap-6'>
          <Button className='flex items-center gap-2 col-span-3 lg:col-span-1  text-white'><FaLocationDot size={24} />Check-in</Button>
          <Button variant='outline' className='flex col-span-3 lg:col-span-1 items-center gap-2 text-brown'><AiOutlineLike size={24} />Amenities</Button>
          <Button variant='outline' className='flex col-span-3 lg:col-span-1 items-center gap-2 text-brown'><FaSquareParking size={24}  />Parking</Button>
        </div>
        <div className='flex flex-col gap-5 '>
          {faq.map((item, index) => (
            <FAQCard 
              key={item.question} 
              index={index} 
              active={activeTab === index} 
              setActiveTab={setActiveTab} 
              question={item.question} 
              answer={item.answer} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}
export default FAQSection

const faq = [
  {
    question: 'Why do I need to check in before my arrival?',
    answer: 'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
  },
  {
    question: 'Where can I see the status of my online check-in?',
    answer: 'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
  },
  {
    question: 'When do I receive my PIN code?',
    answer: 'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
  },
  {
    question: 'Where can I see the status of my online check-in?2',
    answer: 'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
  },
  {
    question: 'When do I receive my PIN code?3',
    answer: 'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
  },
  {
    question: 'Where can I see the status of my online check-in?1',
    answer: 'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum',
  },

]   