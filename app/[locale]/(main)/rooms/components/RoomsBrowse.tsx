import { getTranslations } from 'next-intl/server'
import { getNearestRoomCards } from '@/app/actions/apaleo/rooms/getNearestRoomCards'
import NotFoundCard from '../[id]/components/NotFoundCard'
import RoomsBrowseList from './RoomsBrowseList'

/**
 * Shown on /rooms when the visitor hasn't picked dates yet (e.g. came from the
 * "Explore rooms" button). Instead of an empty fixed today→tomorrow result, it
 * lists each room at its nearest free night with the price — so the visitor
 * sees rooms exist and can then check their own dates with the form above.
 */
const RoomsBrowse = async ({ locale }: { locale: string }) => {
  const [t, cards] = await Promise.all([
    getTranslations({ locale }),
    getNearestRoomCards(locale),
  ])

  if (cards.length === 0) return <NotFoundCard />

  const translations = {
    perNightFrom: t('roomCard.perNightFrom'),
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
    <div className="flex flex-col gap-6 mb-[30px]">
      <p className="text-dark text-sm md:text-base">{t('roomCard.browseHint')}</p>
      <RoomsBrowseList cards={cards} locale={locale} translations={translations} />
    </div>
  )
}

export default RoomsBrowse
