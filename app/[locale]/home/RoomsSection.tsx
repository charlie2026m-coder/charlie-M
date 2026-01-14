import { RoomsCarousel } from '@/app/[locale]/home/components/RoomsCarousel'
import { getApaleoRooms } from '@/services/getApaleoRooms'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/home/components/Header'

const RoomsSection = async ({ locale }: { locale: string }) => {
  const rooms = await getApaleoRooms()
  const t = await getTranslations({ locale })
  
  // Show fallback UI if no rooms available (e.g., API error)
  if ('error' in rooms || !rooms || rooms.length === 0) {
    return <ErrorCard link='/' isSingleRoom={false} />
  }
  
  return (
    <div id="rooms" className='w-full flex flex-col pt-15'>
      <Header title={t('home.rooms_title')} />
      <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
      <RoomsCarousel items={rooms} />
    </div>
  )
}

export default RoomsSection
