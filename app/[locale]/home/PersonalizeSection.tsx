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
      icon: '/images/pets-icon.svg'
    },
  ]
  return (
    <div className='flex flex-col container px-4 xl:px-[100px]  lg:py-20'>
      <Header title={t('home.personalize_title')} />
      <div className='flex flex-wrap md:gap-x-4 gap-5 md:gap-y-10 mt-5 lg:mt-20'>
        {items.map((item) => (
          <div key={item.title} className='flex w-[400px] flex-col text-mute gap-3'>
            <h3 className='flex gap-2 md:text-[20px] font-bold  text-center'>
              <Image src={item.icon} alt={item.title} width={27} height={27} className='object-cover size-5 md:size-7' />
              {item.title}
            </h3>
            <p className='text-[15px]  w-full md:w-3/4'>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PersonalizeSection;


