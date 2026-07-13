'use client'
import React, { useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/app/_components/ui/button'
import { FaWhatsapp } from 'react-icons/fa'
import { PHONE_NUMBER } from '@/lib/Constants'
import { trackNoAvailability, trackContact, whenGtagReady } from '@/lib/analytics'

const NoRooms = () => {
  const t = useTranslations('noRooms')
  const whatsappHref = `https://wa.me/${PHONE_NUMBER.replace(/\D/g, '')}`

  // GA4 no_availability — guest reached a state with zero bookable rooms
  // (sold out / min-stay dead-end, or everything filtered out). Reads the
  // search params off the URL so no Suspense boundary is needed.
  useEffect(() => whenGtagReady(() => {
    const p = new URLSearchParams(window.location.search)
    trackNoAvailability({
      arrival: p.get('from') ?? undefined,
      departure: p.get('to') ?? undefined,
      guests: p.get('adults') ? Number(p.get('adults')) : undefined,
    })
  }), [])

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
          <a href={whatsappHref} target='_blank' rel='noopener noreferrer' onClick={() => trackContact({ method: 'whatsapp' })} className='flex items-center gap-2'>
            <FaWhatsapp size={18} />
            {t('contactUs')}
          </a>
        </Button>
      </div>
    </div>
  )
}

export default NoRooms