'use client'
import { cn } from '@/lib/utils'
import { bookingStatuses } from '@/types/types';
import { useTranslations } from 'next-intl';

/**
 * The state of a booking, in the guest's language.
 *
 * The labels used to be hardcoded lowercase English — a German guest read
 * "upcoming" and "completed". The keys already existed in both languages (the
 * reservation-list filter tabs use them), so this just reads the same ones.
 *
 * `status` is the raw string Apaleo returns rather than the enum: the card now
 * renders this for EVERY booking instead of only inside a narrowing
 * `isCancelled &&`. An unmapped status therefore has to render nothing rather
 * than look up a translation key that does not exist — next-intl prints the
 * key path straight onto the page when it misses one.
 */
const StatusBadge = ({ status, className }: { status?: string, className?: string }) => {
  const t = useTranslations('profile');
  if (!status) return null;

  const style: Record<string, string> = {
    [bookingStatuses.Confirmed]: 'bg-[#E08A3F1A] text-yellow-500',
    [bookingStatuses.CheckedOut]: 'bg-green/10 text-green',
    [bookingStatuses.InHouse]: 'bg-[#2A94211A] text-[#5F839E]',
    [bookingStatuses.Canceled]: 'bg-red-100 text-red-600',
    [bookingStatuses.NoShow]: 'bg-gray/10 text-gray',
  }
  const labelKey: Record<string, string> = {
    [bookingStatuses.Confirmed]: 'upcoming',
    [bookingStatuses.CheckedOut]: 'completed',
    [bookingStatuses.InHouse]: 'ongoing',
    [bookingStatuses.Canceled]: 'canceled',
    [bookingStatuses.NoShow]: 'noShow',
  }

  const key = labelKey[status]
  if (!key) return null

  return (
    <div className={cn('flex items-center px-2.5 h-6 text-[14px] gap-2 rounded-full', style[status], className)}>
      {t(key)}
    </div>
  )
}

export default StatusBadge
