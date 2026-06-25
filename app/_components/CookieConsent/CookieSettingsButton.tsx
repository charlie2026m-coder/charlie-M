'use client'
import { useTranslations } from 'next-intl'

// Re-opens the Cookiebot consent banner so the visitor can change or withdraw
// consent at any time — withdrawal must be as easy as giving consent.
export function CookieSettingsButton() {
  const t = useTranslations('cookies')

  const handleClick = () => {
    window.Cookiebot?.renew()
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      className='text-white text-sm hover:text-blue transition-colors'
    >
      {t('cookieSettings')}
    </button>
  )
}
