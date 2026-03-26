'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/app/_components/ui/button'
import { Link } from '@/navigation'

const NotFoundCard = ({
  text,
}: {
  text?: string
}) => {
  const t = useTranslations()

  return (
    <div className='container px-4 md:px-[100px] py-20 text-center'>
      <h2 className='text-2xl font-bold text-gray-700 mb-4'>
        {text || t('errors.noRoomsFound')}
      </h2>
      <p className='text-gray-600 mb-6'>
        {t('errors.tryDifferentDates')}
      </p>

    </div>
  )
}

export default NotFoundCard