'use client'

import { Link } from '@/navigation'
import { Button } from '@/app/_components/ui/button'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

const ErrorCard = ({
  link,
  isSingleRoom = false,
}: {
  link?: string
  isSingleRoom?: boolean
}) => {
  const t = useTranslations()

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className='container px-4 md:px-[100px] py-20 text-center'>
      <h2 className='text-2xl font-bold text-gray-700 mb-4'>
        {isSingleRoom ? t('errors.roomLoadError') : t('errors.roomsLoadError')}
      </h2>
      <p className='text-gray-600 mb-6'>
        {t('errors.pleaseTryAgain')}
      </p>
      <div className='flex gap-4 justify-center'>
        <Button onClick={handleReload} variant='default'>
          {t('errors.reloadPage')}
        </Button>
        {isSingleRoom && link && (
          <Link href={link}>
            <Button variant='outline'>
              ← {t('errors.backToRooms')}
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export default ErrorCard