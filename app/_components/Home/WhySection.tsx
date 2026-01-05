import Image from 'next/image'
import { LuCircleCheckBig } from "react-icons/lu";
import { IoCalendarOutline } from "react-icons/io5";
import { BsChatDots } from "react-icons/bs";
import { getTranslations } from 'next-intl/server'

const WhySection = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale })

  const cards = [
    {
      title: t('home.point_1'),
      text: t('home.point_1_text'),
      icon: <LuCircleCheckBig className={icon} />
  
    },
    {
      title: t('home.point_2'),
      text: t('home.point_2_text'),
      icon: <Image src='/images/lock-icon.svg' className='object-cover size-6' width={24} alt='lock-image' height={24}/>
    },
    {
      title: t('home.point_3'),
      text: t('home.point_3_text'),
      icon: <IoCalendarOutline className={icon} />
  
    },
  
    {
      title: t('home.point_4'),
      text: t('home.point_4_text'),
      icon: <BsChatDots className={icon} />
  
    },
  ]
  
  const Texts = () => {
    return (
      <div className='py-9 px-5 mb-5 rounded-xl bg-blue/20 flex flex-col items-center justify-center font-semibold text-[20px] md:text-[26px] text-dark'>
        <p className='text-center'>{t('home.concept_subtitle')}</p>
        <p className='text-center'>{t('home.concept_subtitle_2')}</p>
      </div>
    )
  }
  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <h2 className='font-medium text-3xl md:text-[40px] mb-12'>{t('home.concept_title')}</h2>
      <div className='hidden md:block'>
        <Texts />
      </div>

      <div className='grid lg:grid-cols-2 xl:grid-cols-5 gap-10 '>
        <div className='flex relative xl:col-span-2 '>
          <Image 
            src='/images/why-image.webp' 
            alt='why1' 
            width={450} 
            height={320} 
            className='rounded-[20px] object-cover w-full h-[320px] z-10 border-b-3 border-r-10 border-blue'
          />
        </div>
        <div className='md:hidden'>
          <Texts />
        </div>


        <div className='grid grid-cols-2 gap-6 w-full xl:col-span-3'>
          {cards.map((card) => (
            <div key={card.title} className='group flex flex-col items-center md:flex-row px-5 py-6 items-center  rounded-lg border border-[#EBEBEB] gap-2.5 hover:border-blue hover:bg-blue transition-all duration-300 '>
              <div className='size-[50px] min-w-[50px] group-hover:bg-white rounded-full bg-blue flex items-center self-center justify-center transition-all duration-300'>
                {card.icon}
              </div>
              <div className='flex flex-col items-center md:items-start'>
                <h3 className='font-medium text-center md:text-start'>{card.title}</h3>
                <p className='text-sm text-center md:text-start'>{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
  </div>
  )
}

export default WhySection;


const icon = 'size-6'
