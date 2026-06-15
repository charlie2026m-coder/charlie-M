import { RoomsCarousel } from '@/app/[locale]/_home/components/RoomsCarousel'
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import { getNearestAvailableRooms } from '@/app/actions/apaleo/rooms/getNearestAvailableRooms'
import ErrorCard from '@/app/[locale]/(main)/rooms/components/ErrorCard'
import { getTranslations } from 'next-intl/server'
import Header from '@/app/[locale]/_home/components/Header'
import type { HomeRoomCard } from '@/types/offers'
import { roomsDetails } from '@/content/RoomsDetails'

const RoomsSection = async ({ locale }: { locale: string }) => {
  const [t, roomDetails, nearest] = await Promise.all([
    getTranslations({ locale }),
    getRoomDetails(),
    getNearestAvailableRooms(),
  ])

  // Drive the showcase off AVAILABILITY (the guest's ask: "free rooms by
  // nearest date"). For each available room type, take metadata from Supabase
  // (preferred — has localized titles + photos), falling back to the static
  // content catalog so a room type that's free in Apaleo but not yet seeded in
  // Supabase still appears (date, no photo) rather than being hidden.
  const supaById = new Map(roomDetails.map(r => [r.id, r]))
  const contentById = new Map(roomsDetails.map(r => [r.id, r]))

  const homeCards: HomeRoomCard[] = nearest
    .map((n): HomeRoomCard | null => {
      const s = supaById.get(n.roomId)
      const c = contentById.get(n.roomId)
      if (!s && !c) return null // no metadata anywhere → can't render a card
      return {
        id: n.roomId,
        name: s ? (locale === 'de' ? s.title_de : s.title_en) : (c?.group ?? n.roomId),
        images: s?.photos ?? [],
        attributes: s?.attributes ?? c?.attributes ?? [],
        size: s?.size ?? c?.size ?? 0,
        maxPersons: s?.max_persons ?? c?.maxPersons ?? 2,
        unitGroup: { id: n.roomId },
        oneNightPrice: n.oneNightPrice,
        isBooked: false,
        arrival: n.arrival,
        departure: n.departure,
      }
    })
    .filter((card): card is HomeRoomCard => card !== null)

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
