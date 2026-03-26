'use client'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface CheckedInLabelProps {
  isBig?: boolean
}

export const CheckedInLabel = ({ isBig = false }: CheckedInLabelProps) => {
  const t = useTranslations('profile')

  return (
    <div 
      className={cn(
        'bg-green/10 border border-green/30 rounded-full flex items-center justify-center',
        isBig ? 'h-[35px] px-5' : 'h-[30px] px-3'
      )}
    >
      <span className={cn('font-semibold text-green', isBig ? 'text-sm' : 'text-sm')}>
        {t('checkedIn')}
      </span>
    </div>
  )
}
