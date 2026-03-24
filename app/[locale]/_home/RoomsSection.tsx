import { RoomsCarousel } from '@/app/[locale]/_home/components/RoomsCarousel'
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import ErrorCard from '@/app/[locale]/(main)/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/_home/components/Header'
import type { HomeRoomCard } from '@/types/offers'

const RoomsSection = async ({ locale }: { locale: string }) => {
  const [t, roomDetails] = await Promise.all([
    getTranslations({ locale }),
    getRoomDetails(),
  ])

  if (roomDetails.length === 0) {
    return (
      <div id="rooms" className='w-full flex flex-col pt-15'>
        <Header title={t('home.rooms_title')} />
        <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
        <ErrorCard link='/' isSingleRoom={false} />
      </div>
    )
  }

  // Static cards from Supabase — prices will be fetched client-side by RoomsCarousel
  const homeCards: HomeRoomCard[] = roomDetails.map(room => ({
    id: room.id,
    name: locale === 'de' ? room.title_de : room.title_en,
    images: room.photos,
    attributes: room.attributes ?? [],
    size: room.size,
    maxPersons: room.max_persons,
    unitGroup: { id: room.id },
    oneNightPrice: 0,
    isBooked: false,
  }))

  const roomCardTranslations = {
    perNightFrom: t('roomCard.perNightFrom'),
    loading: t('roomCard.loading'),
    bookNow: t('roomCard.bookNow'),
    booked: t('roomCard.booked'),
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
