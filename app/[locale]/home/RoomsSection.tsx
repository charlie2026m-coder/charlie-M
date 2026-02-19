import { RoomsCarousel } from '@/app/[locale]/home/components/RoomsCarousel'
import { getAvailableRooms } from '@/services/getAvailableRooms'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import NoRoomsAvailable from '@/app/[locale]/home/components/NoRoomsAvailable'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/home/components/Header'
import { RATE_PLANS } from '@/lib/Constants'

const RoomsSection = async ({ locale }: { locale: string }) => {
  try {
    const rooms = await getAvailableRooms(undefined, undefined, 1, locale)
    const t = await getTranslations({ locale })
    
    // Show fallback UI if error object returned
    if ('error' in rooms) {
      console.error('Error loading rooms:', rooms.error)
      return (
        <div id="rooms" className='w-full flex flex-col pt-15'>
          <Header title={t('home.rooms_title')} />
          <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
          <ErrorCard link='/' isSingleRoom={false} />
        </div>
      )
    }

    // Show fallback UI if no rooms available
    if (!rooms || rooms.length === 0) {
      console.log('No rooms available')
      return (
        <div id="rooms" className='w-full flex flex-col pt-15'>
          <Header title={t('home.rooms_title')} />
          <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
          <NoRoomsAvailable />
        </div>
      )
    }

    const standartPriceRooms = rooms.filter(room => room.ratePlan.code.includes(RATE_PLANS.STANDARD))
    
    // If no standard rooms found, show no rooms available
    if (standartPriceRooms.length === 0) {
      console.log('No standard price rooms available')
      return <NoRoomsAvailable />
    }
    
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
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error in RoomsSection:', error)
    return <ErrorCard link='/' isSingleRoom={false} />
  }
}

export default RoomsSection
