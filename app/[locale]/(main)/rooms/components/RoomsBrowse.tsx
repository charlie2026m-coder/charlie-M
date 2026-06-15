import { getTranslations } from 'next-intl/server'
import { getNearestRoomCards } from '@/app/actions/apaleo/rooms/getNearestRoomCards'
import RoomCard from '@/app/[locale]/_home/components/RoomCard'
import NotFoundCard from '../[id]/components/NotFoundCard'

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((item) => (
          <RoomCard key={item.id} item={item} locale={locale} translations={translations} />
        ))}
      </div>
    </div>
  )
}

export default RoomsBrowse
