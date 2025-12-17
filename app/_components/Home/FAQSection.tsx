'use client'
import Image from 'next/image'
import FAQCard from './FAQCard';
import { useState } from 'react';
import { cn } from '@/lib/utils';


const FAQSection = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [activeFAQ, setActiveFAQ] = useState('Check-in & Access')
  return (
    <div className='w-full grid grid-cols-1 lg:grid-cols-2 container px-4 lg:px-[100px] py-[85px] gap-12 '>
      <div className='col-span-1 flex flex-col'>
        <h2 className='text-[40px] lg:text-6xl font-bold jakarta leading-[1.2] mb-8'>Frequently Asked Questions</h2>
        <Image src='/images/city.webp' alt='faq' width={576} height={465} className='w-full  rounded-[40px] object-cover' />
      </div>
      <div className='col-span-1 flex flex-col '>
        <div className='grid grid-cols-2 xl:grid-cols-3 justify-between mb-10 gap-6'>
          {faqPoints.map((item, index) => 
            <div
              className={cn('flex items-center justify-center rounded-full py-2.5 text-center border border-mute text-mute cursor-pointer transition-all duration-300 ', activeFAQ === item.title ? 'bg-mute text-white border-mute' : 'border border-mute text-mute')} 
              onClick={() => {
                setActiveFAQ(item.title)
                setActiveTab(0)
              } }
              key={item.title}
            >{item.title}</div>
          )}
        </div>
        <div className='flex flex-col gap-5 '>
          {faqPoints.filter((item) => item.title === activeFAQ)[0].items.map((item, index) => (
            <FAQCard 
              key={item.title} 
              index={index} 
                active={activeTab === index} 
                setActiveTab={setActiveTab} 
                question={item.title} 
                items={item.p} 
              />
            ))}
        </div>
      </div>
    </div>
  )
}
export default FAQSection

 
const faqPoints = [
  {
    title: 'Check-in & Access',
    items: [
      {
        title: 'How does the online check-in work?',
        p:[
          'At Charlie M, the online check-in is a quick digital step that makes your arrival completely smooth and contactless.',
          'After you book, we\’ll send you a link where you can securely confirm your details and complete the mandatory registration. This allows us to verify your identity, prepare your stay, and activate your personal access PIN.',
          'Once your online check-in is finished, your PIN will be sent to you on the day of your arrival. You\’ll receive it by email and Whatsapp, and it will give you access to both the building and your room.',
          'Because we don\’t have a reception on-site, the online check-in must be completed before you arrive — otherwise we won\’t be able to generate your access code',
        ]
      },
      {
        title: 'When will I receive my access PIN?',
        p:[
          'Your access PIN is generated only after you complete the online check-in. You\’ll receive it on the day of arrival by email and Whatsapp, typically by early afternoon. This PIN is needed to enter both the building and your room.',
        ]
      },
      {
        title: 'Which doors can I open with my PIN?',
        p:[
          'Your personal PIN gives you access to everything you need during your stay. With this code, you can open the main entrance, your room door, the laundry room, and the luggage locker room. No keys or cards needed—just one PIN for all areas.',
        ]
      },
      {
        title: 'Can I store my luggage in the hotel?',
        p:[
          'We offer secure free luggage lockers in the building where you can store your bags before check-in or after check-out. If no lockers are available at the moment, you\’ll find a nearby alternative at Stasher Luggage Storage, Friedrichstraße 56, 10117 Berlin.',
        ]
      },
    ]
  },
  {
    title: 'During Your Stay',
    items: [
      {
        title: 'How do I contact support if I need help?',
        p:[
          'If you need help at any time, our team is available 24/7. You can send us a message on WhatsApp, or call us directly by phone. We\’re always here to support you during your stay.',
        ]
      },
      {
        title: 'How often is my apartment cleaned?',
        p:[
          'Your apartment is thoroughly cleaned and prepared before your arrival. For stays longer than 7 nights, we offer a complimentary weekly cleaning. If you\’d like an additional refresh at any time, you can book an extra cleaning for X.',
        ]
      },
      {
        title: 'Where can I get fresh towels and extra amenities?',
        p:[
          'You\’re welcome to take fresh towels and extra amenities from our Essentials Closet whenever you like. It’s available and free for you at all times.',
        ]
      },
      {
        title: 'Is smoking allowed?',
        p:[
          'Smoking inside the room is strictly forbidden. It\’s only allowed on private balconies or on the shared terrace. If your room doesn\’t include these outdoor spaces, please smoke outside the building.',
        ]
      },
      {
        title: 'Can I do my laundry in the hotel?',
        p:[
          'Absolutely. A guest laundry room is available on-site, so you can wash your clothes whenever you need.',
        ]
      },


    ]
  },
  {
    title: 'Extra Services',
    items: [
      {
        title: 'Which extra services are available at the hotel?',
        p:[
          'We offer several extra services to make your stay even more comfortable, including breakfast, parking, early check-in, late check-out, and special packages. You can book any of these extras directly on our website or simply add them to your existing reservation.',
        ]
      },
      {
        title: 'Are pets allowed?',
        p:[
          'Yes, pets are welcome! We charge a one-time fee of X for the entire stay, and your fluffy friend can enjoy the trip with you.',
        ]
      },
    ]
  },
  {
    title: 'Booking adjustments',
    items: [
      {
        title: 'How do I change or cancel my reservation?',
        p:[
          'If you booked directly through the Charlie M website, you can easily change or cancel your reservation in your guest account.',
          'For flexible rates, any eligible refund will be automatically returned to your original payment method.',
          'If your booking was made through a partner platform (such as Booking.com, Airbnb, or Expedia), please make any changes or cancellations directly on that platform. Refunds will also be handled by the provider you booked with.',
        ]
      },
      {
        title: 'When can I receive my invoice?',
        p:[
          'You can receive your invoice after your stay. As soon as you check out, your invoice will be available for download or can be sent to you upon request.'
          ]
      },
    ]
  },
]