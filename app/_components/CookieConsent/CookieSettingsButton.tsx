'use client'
import { useTranslations } from 'next-intl'
import { COOKIE_SETTINGS_EVENT } from './CookieConsentBanner'

export function CookieSettingsButton() {
  const t = useTranslations('cookies')

  const handleClick = () => {
    window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))
  }

  return (
    <button
      onClick={handleClick}
      className='text-white text-sm hover:text-blue transition-colors'
    >
      {t('cookieSettings')}
    </button>
  )
}
