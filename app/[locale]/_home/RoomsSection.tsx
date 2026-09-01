import { RoomsCarousel } from '@/app/[locale]/_home/components/RoomsCarousel'
import { getNearestRoomCards } from '@/app/actions/apaleo/rooms/getNearestRoomCards'
import ErrorCard from '@/app/[locale]/(main)/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/_home/components/Header'

const RoomsSection = async ({ locale }: { locale: string }) => {
  // Availability-driven showcase: one card per room type at its nearest free
  // night with that night's price (shared with the /rooms browse view).
  const [t, homeCards] = await Promise.all([
    getTranslations({ locale }),
    getNearestRoomCards(locale),
  ])

  // Apaleo unreachable or genuinely nothing free in the window → show the
  // graceful fallback rather than an empty carousel.
  if (homeCards.length === 0) {
    return (
      <div id="rooms" className='w-full flex flex-col pt-15'>
        <Header title={t('home.rooms_title')} />
        <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
        <ErrorCard link='/' isSingleRoom={false} />
      </div>
    )
  }

  const roomCardTranslations = {
    perNightFrom: t('roomCard.perNightFrom'),
    taxesIncluded: t('roomCard.taxesIncluded'),
    loading: t('roomCard.loading'),
    bookNow: t('roomCard.bookNow'),
    booked: t('roomCard.booked'),
    nextAvailable: t('roomCard.nextAvailable'),
    roomParams: {
      max: t('roomParams.max'),
      kingSize: t('roomParams.kingSize'),
      queenSize: t('roomParams.queenSize'),
      single: t('roomParams.single'),
      balcony: t('roomParams.balcony'),
      terrace: t('roomParams.terrace'),
    },
  }

  return (
    <div id="rooms" className='w-full flex flex-col pt-15'>
      <Header title={t('home.rooms_title')} />
      <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
      <RoomsCarousel items={homeCards} locale={locale} translations={roomCardTranslations} />
    </div>
  )
}

export default RoomsSection
