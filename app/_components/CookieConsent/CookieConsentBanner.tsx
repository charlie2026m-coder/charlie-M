'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { applyConsent, getStoredConsent, type ConsentState } from '@/lib/analytics'

export function CookieConsentBanner() {
  const t = useTranslations('cookies')
  const [visible, setVisible] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [ads, setAds] = useState(false)

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored) {
      applyConsent(stored)
    } else {
      setVisible(true)
    }

    const handler = () => {
      const current = getStoredConsent()
      if (current) {
        setAnalytics(current.analytics)
        setAds(current.ads)
      }
      setVisible(true)
    }

    window.addEventListener('cookie-settings-open', handler)
    return () => window.removeEventListener('cookie-settings-open', handler)
  }, [])

  if (!visible) return null

  const save = (consent: ConsentState) => {
    applyConsent(consent)
    setVisible(false)
  }

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6'>
      <div className='max-w-xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 flex flex-col gap-4'>
        <div>
          <h3 className='font-semibold text-base mb-1'>{t('title')}</h3>
          <p className='text-sm text-gray-500'>{t('description')}</p>
        </div>

        <div className='flex flex-col gap-3'>
          <Toggle
            label={t('analyticsTitle')}
            description={t('analyticsDescription')}
            checked={analytics}
            onChange={setAnalytics}
          />
          <Toggle
            label={t('adsTitle')}
            description={t('adsDescription')}
            checked={ads}
            onChange={setAds}
          />
        </div>

        <div className='flex flex-col sm:flex-row gap-2'>
          <button
            onClick={() => save({ analytics: false, ads: false })}
            className='flex-1 py-2 px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            {t('rejectAll')}
          </button>
          <button
            onClick={() => save({ analytics, ads })}
            className='flex-1 py-2 px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            {t('savePreferences')}
          </button>
          <button
            onClick={() => save({ analytics: true, ads: true })}
            className='flex-1 py-2 px-4 text-sm bg-green text-white rounded-lg hover:bg-green/90 transition-colors'
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div>
        <p className='text-sm font-medium'>{label}</p>
        <p className='text-xs text-gray-400'>{description}</p>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-green' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
