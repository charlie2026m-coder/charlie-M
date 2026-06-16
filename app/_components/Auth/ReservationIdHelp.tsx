'use client'

import { useState } from 'react'
import { FiHelpCircle } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { useTranslations } from 'next-intl'
import { PHONE_NUMBER } from '@/lib/Constants'

const STEPS = ['helpStep1', 'helpStep2', 'helpStep3', 'helpStep4'] as const

/**
 * Shared "Where do I find my Reservation ID?" helper shown next to every
 * Reservation-ID input (login "Continue with Reservation ID" + profile "Add
 * via Reservation ID"). Reuses the canonical `login.helpTitle`/`helpStep1-4`
 * instruction (format XXXXX-0, e.g. RKAA-1234-0) so the wording stays in one
 * place, plus a WhatsApp fallback for guests who can't find their ID.
 */
export function ReservationIdHelp({ className = '' }: { className?: string }) {
  const t = useTranslations('checkIn')
  const [open, setOpen] = useState(false)
  const whatsappHref = `https://wa.me/${PHONE_NUMBER.replace(/\D/g, '')}`

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm text-brown hover:text-brown/70 transition-colors"
      >
        <FiHelpCircle className="size-4 shrink-0" />
        {t('helpTitle')}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl bg-light-bg p-3.5 text-sm text-mute">
          <ol className="list-decimal pl-4 space-y-1.5 mb-3">
            {STEPS.map((step) => (
              <li key={step} className="leading-relaxed">{t(step)}</li>
            ))}
          </ol>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#25D366] px-3 py-1.5 text-sm font-medium text-mute transition-colors hover:bg-[#25D366]/10"
          >
            <FaWhatsapp className="size-4 text-[#25D366]" />
            {t('helpCantFind')}
          </a>
        </div>
      )}
    </div>
  )
}

export default ReservationIdHelp
