import { RoomsCarousel } from '@/app/[locale]/_home/components/RoomsCarousel'
import { getRooms } from '@/app/actions/apaleo/rooms/getRooms'
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import ErrorCard from '@/app/[locale]/(main)/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/_home/components/Header'
import type { HomeRoomCard } from '@/types/offers'

const RoomsSection = async ({ locale }: { locale: string }) => {
  try {
    const t = await getTranslations({ locale })

    const [apaleoResult, allRoomsDetails] = await Promise.allSettled([
      getRooms(undefined, undefined, 1, locale),
      getRoomDetails(),
    ])

    const apaleoRooms = apaleoResult.status === 'fulfilled' && !('error' in apaleoResult.value)
      ? apaleoResult.value
      : []

    const roomDetails = allRoomsDetails.status === 'fulfilled' ? allRoomsDetails.value : []

    // Always render all Supabase rooms; mark as booked when Apaleo has no offer
    const homeCards: HomeRoomCard[] = roomDetails.map(roomDetail => {
      const title = locale === 'de' ? roomDetail.title_de : roomDetail.title_en
      const apaleoRoom = apaleoRooms.find(r => r.id === roomDetail.id)

      return {
        id: roomDetail.id,
        name: title,
        images: roomDetail.photos,
        attributes: roomDetail.attributes ?? [],
        size: roomDetail.size,
        maxPersons: roomDetail.max_persons,
        unitGroup: { id: roomDetail.id },
        oneNightPrice: apaleoRoom?.oneNightPrice ?? 0,
        isBooked: !apaleoRoom,
      }
    })

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
      }
    }

    return (
      <div id="rooms" className='w-full flex flex-col pt-15'>
        <Header title={t('home.rooms_title')} />
        <span className='w-full text-dark text-lg text-center mb-12'>{t('home.rooms_subtitle')}</span>
        <RoomsCarousel items={homeCards} locale={locale} translations={roomCardTranslations} />
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in RoomsSection:', error)
    return <ErrorCard link='/' isSingleRoom={false} />
  }
}

export default RoomsSection
