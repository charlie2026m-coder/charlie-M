'use client'
import FAQCard from './components/FAQCard';
import { useState } from 'react';
import Header from './components/Header';
import FAQList from './components/FAQList';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const FAQSection = () => {
  const t = useTranslations('home')
  const [activeTab, setActiveTab] = useState(0)
  const [activeFAQ, setActiveFAQ] = useState('Check-in & Access')

  const faqPoints = [
    {
      title: 'Check-in & Access',
      items: [
        {
          title: t.raw('faq_categories.0.items.0.title'),
          p:[ t.raw('faq_categories.0.items.0.p.0'), t.raw('faq_categories.0.items.0.p.1'), t.raw('faq_categories.0.items.0.p.2'), t.raw('faq_categories.0.items.0.p.3'),]
        },
        { title: t.raw('faq_categories.0.items.1.title'), p:[t.raw('faq_categories.0.items.1.p.0'),] },
        { title: t.raw('faq_categories.0.items.2.title'), p:[t.raw('faq_categories.0.items.2.p.0'),] },
        { title: t.raw('faq_categories.0.items.3.title'), p:[t.raw('faq_categories.0.items.3.p.0'),] },
      ]
    },
    {
      title: t.raw('faq_categories.1.title'),
      items: [
        { title: t.raw('faq_categories.1.items.0.title'), p:[t.raw('faq_categories.1.items.0.p.0'),] },
        { title: t.raw('faq_categories.1.items.1.title'), p:[t.raw('faq_categories.1.items.1.p.0'),] },
        { title: t.raw('faq_categories.1.items.2.title'), p:[t.raw('faq_categories.1.items.2.p.0'), ]},
        { title: t.raw('faq_categories.1.items.3.title'), p:[t.raw('faq_categories.1.items.3.p.0'),]},
        { title: t.raw('faq_categories.1.items.4.title'), p:[t.raw('faq_categories.1.items.4.p.0'), ] },
      ]
    },
    {
      title: t.raw('faq_categories.2.title'),
      items: [
        { title: t.raw('faq_categories.2.items.0.title'),p:[t.raw('faq_categories.2.items.0.p.0'),]},
        { title: t.raw('faq_categories.2.items.1.title'), p:[t.raw('faq_categories.2.items.1.p.0'),]},
      ]
    },
    { title: t.raw('faq_categories.3.title'),
      items: [
        { title: t.raw('faq_categories.3.items.0.title'), p:[t.raw('faq_categories.3.items.0.p.0'), t.raw('faq_categories.3.items.0.p.1'), t.raw('faq_categories.3.items.0.p.2'),]},
        { title: t.raw('faq_categories.3.items.1.title'),p:[t.raw('faq_categories.3.items.1.p.0'),]},
      ]
    },
  ]
  const handleActiveIndexChange = (index: number) => {
    setActiveFAQ(faqPoints[index].title)
  }
  return (
    <div id="faq" className='flex flex-col container px-4 xl:px-[100px] pb-10'>
      <Header title='Frequently Asked Questions' />
      <div className='grid lg:grid-cols-10 pt-8 gap-5'>

        <div className='hidden lg:block col-span-4 '>
          <FAQList items={faqPoints} onActiveIndexChange={handleActiveIndexChange} />
        </div>
        <div className='lg:hidden grid xxs:grid-cols-2 col-span-1 gap-2'>
          {faqPoints.map((item, index) => (
            <div 
              key={item.title} 
              className={cn('flex items-center font-bold text-sm py-2.5 border rounded-full cursor-pointer text-center justify-center', activeFAQ === item.title && 'bg-light-bg')}
              onClick={() => handleActiveIndexChange(index)}  
            >
              {item.title}
            </div>
          ))}
        </div>
        <div className='lg:col-span-6 flex flex-col '>
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
    </div>
  )
}
export default FAQSection

 
