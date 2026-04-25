'use client'
import { useTranslations } from 'next-intl'

export function CookieSettingsButton() {
  const t = useTranslations('cookies')

  const handleClick = () => {
    window.dispatchEvent(new Event('cookie-settings-open'))
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
