import Header from "./components/Header"
import { getTranslations } from 'next-intl/server'
import Image from "next/image";

const PersonalizeSection = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale })
  const items =[

    {
      title: t('home.personalize_items.0.title'),
      text: t('home.personalize_items.0.text'),
      icon: '/images/car-icon.svg'
    },
    {
      title: t('home.personalize_items.1.title'),
      text: t('home.personalize_items.1.text'),
      icon: '/images/icons/bf-icon.svg'
    },
    {
      title: t('home.personalize_items.2.title'),
      text: t('home.personalize_items.2.text'),
      icon: '/images/clean-icon.svg'
    },
    {
      title: t('home.personalize_items.3.title'),
      text: t('home.personalize_items.3.text'),
      icon: '/images/checkin-icon.svg' 
    },
    {
      title: t('home.personalize_items.4.title'),
      text: t('home.personalize_items.4.text'),
      icon: '/images/checkin-icon.svg' 
    },

    {
      title: t('home.personalize_items.5.title'),
      text: t('home.personalize_items.5.text'),
      icon: '/images/pets-icon.svg'
    },


  ]
  return (
    <div className='flex flex-col container px-4 xl:px-[100px]  lg:py-20'>
      <Header title={t('home.personalize_title')} isThin={true} size="md" />
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 md:gap-y-10'>
        {items.map((item) => (
          <div key={item.title} className='flex  md:items-center flex-col text-mute gap-3'>
            <h3 className='flex gap-2 text-base md:text-[20px] font-bold md:text-center'>
              <Image src={item.icon} alt={item.title} width={27} height={27} className='object-cover size-5 md:size-7' />
              {item.title}
            </h3>
            <p className='text-sm md:text-[15px] md:text-center w-full md:w-3/4'>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PersonalizeSection;


