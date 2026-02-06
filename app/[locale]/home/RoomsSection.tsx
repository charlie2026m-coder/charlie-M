import { RoomsCarousel } from '@/app/[locale]/home/components/RoomsCarousel'
import { getAvailableRooms } from '@/services/getAvailableRooms'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/home/components/Header'
import { RATE_PLANS } from '@/lib/Constants'

const RoomsSection = async ({ locale }: { locale: string }) => {
  const rooms = await getAvailableRooms()
  const t = await getTranslations({ locale })
  
  // Show fallback UI if no rooms available (e.g., API error)
  if ('error' in rooms || !rooms || rooms.length === 0) {
    return <ErrorCard link='/' isSingleRoom={false} />
  }
  const standartPriceRooms = rooms.filter(room => room.ratePlan.code.includes(RATE_PLANS.STANDARD))
  
  const roomCardTranslations = {
    perNightFrom: t('roomCard.perNightFrom'),
    loading: t('roomCard.loading'),
    bookNow: t('roomCard.bookNow'),
  }
  
  return (
    <div id="rooms" className='w-full flex flex-col pt-15'>
      <Header title={t('home.rooms_title')} />
      <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
      <RoomsCarousel items={standartPriceRooms} locale={locale} translations={roomCardTranslations} />
    </div>
  )
}

export default RoomsSection
