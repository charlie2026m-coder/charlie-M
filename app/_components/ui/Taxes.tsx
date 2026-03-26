'use client'

import { AiOutlineInfoCircle } from 'react-icons/ai'
import { useTranslations } from 'next-intl'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/app/_components/ui/tooltip'

interface TaxesInfoProps {
  taxes: { vatTax: number; cityTax: number } | null | undefined
  className?: string
}

const TaxesInfo = ({ taxes, className = '' }: TaxesInfoProps) => {
  const t = useTranslations('bookingForm')

  if (!taxes) return null

  return (
    <div className={`flex items-center gap-1 -mt-1 ${className}`}>
      <span className='text-sm text-gray-400'>{t('taxesIncluded')}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type='button' className='text-gray-400 hover:text-gray-600 flex items-center ml-auto'>
            <AiOutlineInfoCircle className='size-4' />
          </button>
        </TooltipTrigger>
        <TooltipContent className='flex flex-col gap-1 text-xs' side='bottom'>
          <span>VAT: €{taxes.vatTax.toFixed(2)}</span>
          <span>City Tax: €{taxes.cityTax.toFixed(2)}</span>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default TaxesInfo
