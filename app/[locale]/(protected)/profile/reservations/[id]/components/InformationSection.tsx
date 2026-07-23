'use client'
import { useEffect, useRef, useState } from 'react'
import InfoCard from './InfoCard'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/navigation'

// WiFi is the most-asked-for item → first, with a subtle accent.
const FEATURED_ID = 6
const GROUPS: { key: string; ids: number[] }[] = [
  { key: 'inRoom', ids: [6, 5] }, // WiFi (featured), Coffee Machine
  { key: 'inBuilding', ids: [1, 3, 4, 2, 8, 9, 7] }, // Co-Working, Closet, Laundry, Luggage, Refresh, Garbage, Lost & Found
]

const InformationSection = () => {
  const t = useTranslations('profile')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  // EN/DE switch: animate the sliding indicator first, then navigate.
  const [pendingLocale, setPendingLocale] = useState<'en' | 'de' | null>(null)
  const activeLocale = pendingLocale ?? locale
  const switchLocale = (target: 'en' | 'de') => {
    if (target === locale) return
    setPendingLocale(target)
    setTimeout(() => router.replace(pathname, { locale: target }), 260)
  }

  // One popup open at a time. On desktop: open on hover, close shortly after the
  // cursor leaves both the tile and the popup; on touch: open on tap, close via ✕.
  const [openId, setOpenId] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }
  const show = (id: number) => {
    cancel()
    setOpenId(id)
  }
  const scheduleClose = () => {
    cancel()
    timer.current = setTimeout(() => setOpenId(null), 180)
  }
  const close = () => {
    cancel()
    setOpenId(null)
  }

  useEffect(() => {
    if (openId === null) return
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  useEffect(() => () => cancel(), [])

  const item = (id: number) => {
    const found = infoItems.find((i) => i.id === id)!
    return { ...found, title: t(`informationItems.${id}`) }
  }

  const localeToggle = (target: 'en' | 'de', label: string) => (
    <button
      type='button'
      onClick={() => switchLocale(target)}
      className={`relative z-10 flex-1 px-4 py-1 text-center rounded-full transition-colors duration-300 ${
        activeLocale === target ? 'text-white' : 'text-dark hover:text-mute'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className='w-full'>
      <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='flex flex-col gap-2'>
          <h1 className='font-semibold text-mute text-[30px] md:text-[40px] leading-tight'>
            {t('informationIntro.title')}
          </h1>
          <p className='text-dark text-base md:text-lg'>{t('informationIntro.subtitle')}</p>
        </div>
        <div className='relative inline-flex shrink-0 self-start items-stretch rounded-full border border-light1 p-1 text-sm font-medium sm:self-auto'>
          <span
            aria-hidden='true'
            className='absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-dark-gold transition-transform duration-300 ease-out'
            style={{ transform: activeLocale === 'de' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          {localeToggle('en', 'EN')}
          {localeToggle('de', 'DE')}
        </div>
      </div>

      <div className='flex flex-col gap-8'>
        {GROUPS.map((group) => (
          <section key={group.key}>
            <h2 className='mb-4 font-semibold text-mute text-xl'>
              {t(`informationGroups.${group.key}`)}
            </h2>
            <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4'>
              {group.ids.map((id) => (
                <InfoCard
                  key={id}
                  card={item(id)}
                  featured={id === FEATURED_ID}
                  open={openId === id}
                  onShow={() => show(id)}
                  onScheduleClose={scheduleClose}
                  onClose={close}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default InformationSection

const infoItems = [
  { id: 1, title: 'Co-Working Space', image: '/images/co-working-icon.svg' },
  { id: 2, title: 'Luggage Lockers', image: '/images/luggage-icon.svg' },
  { id: 3, title: 'Self-Service Closet', image: '/images/closet-icon.svg' },
  { id: 4, title: 'Laundry Room', image: '/images/laundry-icon.svg' },
  { id: 5, title: 'In-Room Coffee Machine', image: '/images/coffee-m-icon.svg' },
  { id: 6, title: 'Fast WiFi', image: '/images/wifi-icon.svg' },
  { id: 7, title: 'Lost and Found', image: '/images/lost-icon.svg' },
  { id: 8, title: 'Room Refresh', image: '/images/refresh-icon.svg' },
  { id: 9, title: 'Garbage disposal', image: '/images/garbage-icon.svg' },
]
