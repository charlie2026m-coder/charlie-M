'use client'

import { FaStar } from 'react-icons/fa'
import { useTranslations } from 'next-intl'
import { useGoogleRating } from '@/app/hooks/useGoogleRating'

/**
 * The two trust/urgency signals on a room card.
 *
 * Both render NOTHING rather than a placeholder when their data is missing —
 * an empty rating or an invented count is worse than no badge at all.
 */

/**
 * "★ 4.6 · 203 Google" — the PROPERTY's Google score, shown on every room card
 * because that is the score a guest is actually deciding on (it is also what
 * the OTAs put on their room rows). The word "Google" is part of the badge on
 * purpose: it stops the number reading as a rating of that one studio.
 */
export function GoogleRatingBadge({ className = '' }: { className?: string }) {
  const t = useTranslations('roomCard')
  const { rating, userRatingCount } = useGoogleRating()

  if (rating === null) return null

  const value = rating.toFixed(1)
  const count = userRatingCount ?? 0

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 ${className}`}
      title={t('googleRatingTitle', { rating: value, count })}
    >
      <FaStar
        className="size-[0.9rem] shrink-0 self-center text-dark-gold"
        aria-hidden="true"
      />
      <span className="text-[0.95rem] font-bold leading-none text-dark">{value}</span>
      <span className="text-xs leading-none text-muted">
        Google{count > 0 && ` · ${count}`}
      </span>
    </span>
  )
}

/**
 * "Only 2 left for these dates".
 *
 * Deliberately capped: shown ONLY at or below SCARCITY_THRESHOLD. "Only 9 left"
 * creates no urgency and makes the hotel look empty, and a badge that is always
 * on stops being read at all. Every number here comes straight from Apaleo
 * availability — never a decorative constant.
 */
export const SCARCITY_THRESHOLD = 3

export function UnitsLeftBadge({
  availableUnits,
  compact = false,
  className = '',
}: {
  availableUnits?: number | null
  /**
   * Drops the "for these dates" tail. Use wherever a date chip already sits
   * beside the badge (the home cards): the tail only repeats what that chip
   * says, and the extra width is what pushed the pair onto two rows whenever
   * the date spanned two months ("31 Jul – 1 Aug").
   */
  compact?: boolean
  className?: string
}) {
  const t = useTranslations('roomCard')

  if (typeof availableUnits !== 'number') return null
  if (availableUnits < 1 || availableUnits > SCARCITY_THRESHOLD) return null

  const label = compact
    ? availableUnits === 1
      ? t('onlyOneLeftShort')
      : t('onlyNLeftShort', { count: availableUnits })
    : availableUnits === 1
      ? t('onlyOneLeft')
      : t('onlyNLeft', { count: availableUnits })

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#933F51]/[0.08] px-2.5 py-0.5 text-sm font-medium text-[#933F51] ${className}`}
    >
      {/* A dot, not a warning icon: scarcity is information, not an error. It
          also keeps the badge visually paired with the gold date chip beside it
          instead of shouting over it. */}
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}
