import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/app/_components/ui/button'
import { FaWhatsapp } from 'react-icons/fa'
import { PHONE_NUMBER } from '@/lib/Constants'

const NoRooms = () => {
  const t = useTranslations('noRooms')
  const whatsappHref = `https://wa.me/${PHONE_NUMBER.replace(/\D/g, '')}`

  return (
    <div className='flex flex-col items-center justify-center py-20 px-4'>
      <div className='max-w-md w-full flex flex-col items-center text-center'>
        <Image
          src='/images/room-not-found.svg'
          alt='No rooms found'
          width={165}
          height={252}
          className='w-[165px] h-[252px]'
        />

        <p className='text-dark mb-6'>
          {t('title')}
        </p>

        <Button
          asChild
          className='rounded-full text-base bg-blue hover:bg-blue/80 w-full max-w-50 h-[45px]'
        >
          <a href={whatsappHref} target='_blank' rel='noopener noreferrer' className='flex items-center gap-2'>
            <FaWhatsapp size={18} />
            {t('contactUs')}
          </a>
        </Button>
      </div>
    </div>
  )
}

export default NoRooms