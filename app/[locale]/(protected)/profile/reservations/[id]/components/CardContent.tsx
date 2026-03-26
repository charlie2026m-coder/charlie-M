'use client'
import Image from 'next/image'
import YellowCard from './YellowCard'
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider'
import { TbBrandWhatsappFilled } from 'react-icons/tb'
import { IoMail } from 'react-icons/io5'
import { useTranslations } from 'next-intl'

export default function CardContent({ 
  images, 
  description,
  card1, 
  card2, 
  id
}: { 
  images: string[], 
  description: string[], 
  card1: string[] | undefined, 
  card2: string[] | undefined, 
  id: number
}) {
  const t = useTranslations('profile')

  return (
    <div className='flex flex-col pt-5'>
      {images.length > 1 && (<CustomImageSlider images={images} />)}
      {images.length === 1 && (
        <div className='relative w-full h-[250px] md:h-[400px] rounded-lg mb-5 overflow-hidden'>
          <Image src={images[0]} alt='image' fill className='object-cover' />
        </div>
      )}
      <div className='flex flex-col gap-5 mb-6'>
        {description.map((item) => (
          <p key={item} className={text}>{item}</p>
        ))}
      </div>
      
      {id === 7 && <LostCards />}
      {id === 9 && <GarbageCards />}
      
      {card1 && (
        <>
          {(!card2) ? (
            <YellowCard isFirst={true} items={card1} />
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <YellowCard isFirst={true} items={card1} />
              <YellowCard isFirst={false} items={card2} />
            </div>
          )}

        </>
      )}
    </div>
  )
}

const text = 'text-dark inter text-start'


//Different cards content for Lost and Found card content 
const LostCards = () => {
  const t = useTranslations('profile')
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2 w-full'>{t('infoContent.7.lostCardTitle')}</h4>
        <p className='text-dark inter '>{t('infoContent.7.lostCardDescription')}</p>
      </div>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2  w-full'>{t('infoContent.7.howToReachTitle')}</h4>
        <a
          href='https://wa.me/49XXXXXXXXX' 
          target='_blank' 
          rel='noopener noreferrer'
          className='flex items-center gap-2  rounded-3xl w-full cursor-pointer mb-3 hover:underline'
        >
          <TbBrandWhatsappFilled className='size-6' /> <span>{t('infoContent.7.whatsapp')}</span> +49 XXX XXXX XXX
        </a>
        <a 
          href='mailto:hello@charliem.stay'
          className='flex items-center gap-2 rounded-3xl w-full cursor-pointer hover:underline'
        >
          <IoMail className='size-6' /> <span>{t('infoContent.7.email')}</span> hello@charliem.stay
        </a>
      </div>
    </div>
  )
}

//Different cards content for Garbage disposal card content
const GarbageCards = () => {
  const t = useTranslations('profile')
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2 w-full'>{t('infoContent.9.garbageTitle')}</h4>
        <p className='text-dark inter '>{t('infoContent.9.garbageDescription')}</p>
      </div>
      <YellowCard isFirst={false} items={[t('infoContent.9.garbageLocation')]} />
    </div>
  )
}