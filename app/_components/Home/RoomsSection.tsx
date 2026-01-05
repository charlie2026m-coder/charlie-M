import { Link } from '@/navigation'
import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'
import { getApaleoRooms } from '@/services/getApaleoRooms'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'

const RoomsSection = async ({ locale }: { locale: string }) => {
  const rooms = await getApaleoRooms()
  const t = await getTranslations({ locale })
  
  // Show fallback UI if no rooms available (e.g., API error)
  if ('error' in rooms || !rooms || rooms.length === 0) {
    return <ErrorCard link='/' isSingleRoom={false} />
  }
  
  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center justify-between gap-10'>
        <div className='flex items-center gap-2'>
          <h2 className='font-medium text-[40px]'>{t('home.rooms_title')}</h2>
        </div>
        <Link href='/rooms' className='hidden md:block'>
          <Button variant='outline' className='px-[45px] h-12'>{t('view_all_btn')}</Button>
        </Link>
      </div>
      <span className='w-full text-dark text-lg mb-[50px]'>{t('home.rooms_subtitle')}</span>
      <RoomsCarousel items={rooms} />
      <Link href='/rooms' className='block md:hidden mt-5 '>
          <Button variant='outline' className='px-[45px] !h-[48px] w-full'>{t('view_all_btn')}</Button>
        </Link>
    </div>
  )
}

export default RoomsSection
