'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { applyConsent, getStoredConsent, type ConsentChoice } from '@/lib/analytics'

export const COOKIE_SETTINGS_EVENT = 'cookie-settings-open'

export function CookieConsentBanner() {
  const t = useTranslations('cookies')
  const [visible, setVisible] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [ads, setAds] = useState(false)

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored) {
      applyConsent(stored)
      setAnalytics(stored.analytics)
      setAds(stored.ads)
    } else {
      setVisible(true)
    }

    const handler = () => {
      const current = getStoredConsent()
      setAnalytics(current?.analytics ?? false)
      setAds(current?.ads ?? false)
      setVisible(true)
    }

    window.addEventListener(COOKIE_SETTINGS_EVENT, handler)
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, handler)
  }, [])

  if (!visible) return null

  const save = (consent: ConsentChoice) => {
    applyConsent(consent)
    setVisible(false)
  }

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 p-4 md:bottom-4 md:left-4 md:right-auto md:max-w-[420px]'>
      <div className='bg-white rounded-2xl shadow-2xl border border-blue/20 p-5 flex flex-col gap-4'>
        <div>
          <h3 className='font-semibold text-base text-mute mb-1'>{t('title')}</h3>
          <p className='text-sm text-dark/60'>{t('description')}</p>
          <Link
            href='/privacy-policy'
            className='text-sm text-mute underline underline-offset-2 hover:text-mute/80 mt-1 inline-block'
          >
            {t('privacyPolicyLink')}
          </Link>
        </div>

        <div className='flex flex-col gap-3 p-3 bg-light-bg rounded-xl'>
          <Row
            label={t('necessaryTitle')}
            description={t('necessaryDescription')}
            checked
            disabled
            badge={t('alwaysActive')}
          />
          <div className='h-px bg-blue/20' />
          <Row
            label={t('analyticsTitle')}
            description={t('analyticsDescription')}
            checked={analytics}
            onChange={setAnalytics}
          />
          <div className='h-px bg-blue/20' />
          <Row
            label={t('adsTitle')}
            description={t('adsDescription')}
            checked={ads}
            onChange={setAds}
          />
        </div>

        <div className='flex flex-col sm:flex-row gap-2'>
          <button
            onClick={() => save({ analytics: false, ads: false })}
            className='flex-1 py-2 px-4 text-sm bg-mute text-white rounded-lg hover:bg-mute/80 transition-colors'
          >
            {t('rejectAll')}
          </button>
          <button
            onClick={() => save({ analytics, ads })}
            className='flex-1 py-2 px-4 text-sm border border-mute/40 text-mute rounded-lg hover:bg-mute/5 transition-colors'
          >
            {t('savePreferences')}
          </button>
          <button
            onClick={() => save({ analytics: true, ads: true })}
            className='flex-1 py-2 px-4 text-sm bg-mute text-white rounded-lg hover:bg-mute/80 transition-colors'
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div>
        <p className='text-sm font-medium text-mute'>{label}</p>
        <p className='text-xs text-dark/50'>{description}</p>
      </div>
      {disabled ? (
        <span className='text-xs font-medium text-mute/60 bg-mute/10 px-2 py-1 rounded-full whitespace-nowrap'>
          {badge}
        </span>
      ) : (
        <button
          type='button'
          role='switch'
          aria-checked={checked}
          onClick={() => onChange?.(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            checked ? 'bg-mute' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      )}
    </div>
  )
}
