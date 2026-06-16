'use client'
import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import RoomCard from '@/app/[locale]/_home/components/RoomCard'
import { HomeRoomCard } from '@/types/offers'
import Filters from './Filters'
import NoRooms from './NoRooms'

type RoomCardTranslations = React.ComponentProps<typeof RoomCard>['translations']

/**
 * Client wrapper for the no-dates browse view: renders the filter bar and the
 * room grid, filtering/sorting the (server-provided) cards client-side from the
 * shared Zustand filter store — the same logic the dated RoomsList uses, minus
 * the baby-bed branch (no dates → no service-availability check).
 */
const RoomsBrowseList = ({
  cards,
  locale,
  translations,
}: {
  cards: HomeRoomCard[]
  locale: string
  translations: RoomCardTranslations
}) => {
  const { filter, priceFilter, bedSizeFilter, roomTypeFilter } = useStore()
  const resetRoomsFilters = useStore((s) => s.resetRoomsFilters)
  const setValue = useStore((s) => s.setValue)

  // The filter state is a global store shared with the dated view — reset on
  // mount so a previous selection doesn't leak in, then default browse to
  // cheapest-first (most useful when you're just exploring).
  useEffect(() => {
    resetRoomsFilters()
    setValue(true, 'priceFilter')
  }, [resetRoomsFilters, setValue])

  const filtered = useMemo(() => {
    const list = [...cards].sort((a, b) => {
      // Unpriced cards (no published rate, e.g. on preview) always sink to the
      // bottom regardless of sort direction.
      const aZero = !(a.oneNightPrice > 0)
      const bZero = !(b.oneNightPrice > 0)
      if (aZero !== bZero) return aZero ? 1 : -1
      if (aZero && bZero) return 0
      return priceFilter ? a.oneNightPrice - b.oneNightPrice : b.oneNightPrice - a.oneNightPrice
    })

    return list.filter((c) => {
      if (filter === 'balcony' && !c.attributes?.includes('balcony')) return false
      if (filter === 'terrace' && !c.attributes?.includes('terrace')) return false
      if (filter === 'shared' && !c.attributes?.includes('shared')) return false
      if (bedSizeFilter === 'king' && !c.attributes?.includes('king')) return false
      if (bedSizeFilter === 'queen' && !c.attributes?.includes('queen')) return false
      if (bedSizeFilter === 'single' && !c.attributes?.includes('single')) return false
      if (roomTypeFilter && !c.name.toLowerCase().includes(roomTypeFilter.toLowerCase())) return false
      return true
    })
  }, [cards, priceFilter, filter, bedSizeFilter, roomTypeFilter])

  return (
    <>
      <Filters showBabyBed={false} />
      {filtered.length === 0 ? (
        <NoRooms />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <RoomCard key={item.id} item={item} locale={locale} translations={translations} />
          ))}
        </div>
      )}
    </>
  )
}

export default RoomsBrowseList
