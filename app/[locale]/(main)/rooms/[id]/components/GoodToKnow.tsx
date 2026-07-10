'use client'
import { useTranslations } from 'next-intl'
import { HOTEL_INFO } from '@/lib/Constants'
import { MdOutlinePassword, MdOutlinePets } from 'react-icons/md'
import { FiClock } from 'react-icons/fi'
import { TbWashMachine } from 'react-icons/tb'
import type { IconType } from 'react-icons'

// "Good to know" — surfaces the things that make an AUTOMATED aparthotel feel
// safe to book: how contactless check-in works (the #1 "but how do I get in?"
// worry), check-in/out times, on-site laundry and the pet policy. Times come
// from HOTEL_INFO so there is a single source of truth.
const GoodToKnow = () => {
  const t = useTranslations('goodToKnow')

  const items: { icon: IconType; title: string; text: string }[] = [
    {
      icon: MdOutlinePassword,
      title: t('contactless.title'),
      text: t('contactless.text'),
    },
    {
      icon: FiClock,
      title: t('checkin.title'),
      text: t('checkin.text', { checkin: HOTEL_INFO.checkinTime, checkout: HOTEL_INFO.checkoutTime }),
    },
    {
      icon: TbWashMachine,
      title: t('laundry.title'),
      text: t('laundry.text'),
    },
    {
      icon: MdOutlinePets,
      title: t('pets.title'),
      text: t('pets.text'),
    },
  ]

  return (
    <section aria-labelledby='good-to-know-heading' className='mb-[30px]'>
      <h2
        id='good-to-know-heading'
        className='text-[24px] md:text-[30px] font-semibold text-mute leading-tight mb-6'
      >
        {t('title')}
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        {items.map((it, i) => {
          const Icon = it.icon
          return (
            <div
              key={i}
              className='flex flex-col gap-3 rounded-2xl border border-light1 p-5 bg-white'
            >
              <span
                aria-hidden='true'
                className='grid place-items-center size-10 rounded-full bg-light2 text-blue shrink-0'
              >
                <Icon className='size-5' />
              </span>
              <div>
                <p className='font-semibold text-mute text-[15px] mb-1'>{it.title}</p>
                <p className='text-sm text-dark leading-relaxed'>{it.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default GoodToKnow
