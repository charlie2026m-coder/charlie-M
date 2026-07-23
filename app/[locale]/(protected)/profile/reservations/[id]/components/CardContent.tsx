'use client'
import { type ReactNode } from 'react'
import Image from 'next/image'
import YellowCard from './YellowCard'
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider'
import { TbBrandWhatsappFilled } from 'react-icons/tb'
import { IoMail } from 'react-icons/io5'
import { useTranslations } from 'next-intl'
import { EMAIL, WHATSAPP_NUMBER } from '@/lib/Constants'

export default function CardContent({
  images,
  description,
  card1,
  card2,
  id,
  image,
  title,
  subtitle,
  compact = false,
}: {
  images: string[],
  description: string[],
  card1: string[] | undefined,
  card2: string[] | undefined,
  id: number,
  image?: string,
  title: string,
  subtitle?: string,
  compact?: boolean,
}) {
  return (
    <div className='flex flex-col gap-5'>
      {!compact && (images.length > 1 ? (
        <CustomImageSlider images={images} />
      ) : images.length === 1 ? (
        <div className='relative h-[220px] md:h-[300px] w-full overflow-hidden rounded-2xl'>
          <Image
            src={images[0]}
            alt={title}
            fill
            sizes='(max-width: 768px) 90vw, 700px'
            className='object-cover object-center'
          />
        </div>
      ) : image ? (
        <div className='h-[160px] md:h-[190px] w-full rounded-2xl bg-blue/20 flex items-center justify-center'>
          <span
            aria-hidden='true'
            className='size-16 bg-dark-gold'
            style={{
              WebkitMaskImage: `url(${image})`,
              maskImage: `url(${image})`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain'
            }}
          />
        </div>
      ) : null)}

      {!compact && (
        <div className='flex flex-col gap-1'>
          <h2 className='text-2xl font-black text-mute inter leading-tight'>{title}</h2>
          {subtitle && <p className='text-dark inter text-[14px]'>{subtitle}</p>}
        </div>
      )}

      {description.length > 0 && (
        <div className='flex flex-col gap-3'>
          {description.map((item) => (
            <p key={item} className={text}>{linkify(item)}</p>
          ))}
        </div>
      )}

      {id === 7 && <LostCards />}
      {id === 9 && <GarbageCards />}

      {card1 && (
        (!card2) ? (
          <YellowCard isFirst={true} items={card1} />
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <YellowCard isFirst={true} items={card1} />
            <YellowCard isFirst={false} items={card2} />
          </div>
        )
      )}
    </div>
  )
}

const text = 'text-dark inter text-start font-normal not-italic text-[15px] leading-relaxed tracking-[0]'

// Turn website mentions in the copy into clickable links (more guest-friendly).
const SITE_LINK_RE = /(https?:\/\/[^\s)]+|www\.charlie-m\.de|charlie-m\.de)/gi
function linkify(str: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = new RegExp(SITE_LINK_RE.source, 'gi')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) nodes.push(str.slice(last, m.index))
    const match = m[0]
    const href = match.startsWith('http') ? match : `https://${match}`
    nodes.push(
      <a
        key={m.index}
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-dark-gold underline underline-offset-2 hover:opacity-80'
      >
        {match}
      </a>,
    )
    last = m.index + match.length
  }
  if (last < str.length) nodes.push(str.slice(last))
  return nodes
}

//Different cards content for Lost and Found card content
const LostCards = () => {
  const t = useTranslations('profile')
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2 w-full'>{t('infoContent.7.lostCardTitle')}</h4>
        <p className='text-dark inter text-[15px] leading-relaxed text-left'>{t('infoContent.7.lostCardDescription')}</p>
      </div>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2 w-full'>{t('infoContent.7.howToReachTitle')}</h4>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 font-semibold text-mute'>
          <TbBrandWhatsappFilled className='size-6 shrink-0' />
          <span>{t('infoContent.7.whatsapp')}</span>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`}
            target='_blank'
            rel='noopener noreferrer'
            className='whitespace-nowrap cursor-pointer hover:underline'
          >
            {WHATSAPP_NUMBER}
          </a>
        </div>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-mute'>
          <IoMail className='size-6 shrink-0' />
          <span>{t('infoContent.7.email')}</span>
          <a href={`mailto:${EMAIL}`} className='cursor-pointer hover:underline'>{EMAIL}</a>
        </div>
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
        <h4 className='font-semibold mb-2 w-full text-left'>{t('infoContent.9.garbageTitle')}</h4>
        <p className='text-dark inter text-[15px] leading-relaxed text-left'>{t('infoContent.9.garbageDescription')}</p>
      </div>
      <YellowCard isFirst={false} items={[t('infoContent.9.garbageLocation')]} />
    </div>
  )
}
