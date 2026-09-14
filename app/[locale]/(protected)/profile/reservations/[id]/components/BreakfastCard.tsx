'use client'

/**
 * Breakfast, in the guest's own account.
 *
 * Buying breakfast already lives in AddExtras with the other services; what was
 * missing was any sign that a bought breakfast still needs a menu and a time.
 * Guests who never open the Guestway message had no way of knowing.
 *
 * Read-only here, with one button to the token page. That page is the same
 * screen the message opens, so there is one place where breakfast is chosen
 * rather than two that drift apart — and it is also where the door QR lives.
 */

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LuChevronRight, LuCroissant } from 'react-icons/lu'
import { Button } from '@/app/_components/ui/button'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'

interface Morning {
  morning: string
  persons: number
  menus: { code: string; icon: string; name: string }[]
  chosenMenus: Record<string, number>
  chosenSlot: number | null
  slots: { id: number; startsAt: string; endsAt: string }[]
}

interface View {
  ok: true
  url: string
  mornings: Morning[]
  needsChoice: boolean
}

const BreakfastCard = ({ reservationId }: { reservationId: string }) => {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [view, setView] = useState<View | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/breakfast/my?reservationId=${encodeURIComponent(reservationId)}&locale=${locale}`)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (!cancelled && json?.ok) setView(json as View)
      })
      .catch(() => {
        // No breakfast card is a better failure than an error box on a page
        // that is mostly about the room.
      })
    return () => {
      cancelled = true
    }
  }, [reservationId, locale])

  // Nothing bought, nothing to say. The card only exists once there is a
  // breakfast to choose.
  if (!view || view.mornings.length === 0) return null

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`))

  return (
    <section className='bg-blue/20 rounded-[20px] p-5 w-full mt-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h4 className='flex items-center gap-2 font-semibold'>
          <LuCroissant className='size-5 shrink-0 text-dark-gold' aria-hidden />
          {t('breakfastCardTitle')}
        </h4>
        {view.needsChoice && (
          <span className='rounded-full bg-dark-gold px-3 py-1 text-xs font-medium text-white'>
            {t('breakfastCardNeedsChoice')}
          </span>
        )}
      </div>

      <ul className='mt-3 flex flex-col gap-2'>
        {view.mornings.map(m => {
          const chosen = Object.entries(m.chosenMenus).filter(([, n]) => n > 0)
          const slot = m.slots.find(s => s.id === m.chosenSlot)
          return (
            <li key={m.morning} className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
              <span className='w-24 shrink-0 font-medium'>{dateLabel(m.morning)}</span>
              {chosen.length === 0 ? (
                <span className='text-dark-gold'>{t('breakfastCardNotChosen')}</span>
              ) : (
                <span className='flex flex-wrap items-center gap-2'>
                  {chosen.map(([code, count]) => {
                    const menu = m.menus.find(x => x.code === code)
                    return (
                      <span key={code} className='inline-flex items-center gap-1.5'>
                        <MenuIcon name={menu?.icon ?? ''} className='h-4 w-4 shrink-0' />
                        {count > 1 ? `${count}× ` : ''}
                        {menu?.name ?? code}
                      </span>
                    )
                  })}
                </span>
              )}
              <span className='text-dark'>
                {slot ? `· ${slot.startsAt}–${slot.endsAt}` : `· ${t('breakfastCardNoTime')}`}
              </span>
            </li>
          )
        })}
      </ul>

      <Button asChild className='mt-4 h-[45px]'>
        {/* A plain anchor: /breakfast/{token} lives outside the locale tree, so
            the localised Link would rewrite the path and break the token. */}
        <a href={`${view.url}?lang=${locale === 'de' ? 'de' : 'en'}`}>
          {view.needsChoice ? t('breakfastCardChoose') : t('breakfastCardChange')}
          <LuChevronRight />
        </a>
      </Button>
    </section>
  )
}

export default BreakfastCard
