'use client'
import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import RoomCard from '@/app/[locale]/_home/components/RoomCard'
import { HomeRoomCard } from '@/types/offers'
import Filters from './Filters'
import NoRooms from './NoRooms'
import { trackViewItemList, whenGtagReady } from '@/lib/analytics'

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
  const { filter, priceFilter, bedSizeFilter, roomTypeFilter, browseSorted } = useStore()
  const resetRoomsFilters = useStore((s) => s.resetRoomsFilters)

  // The filter state is a global store shared with the dated view — reset on
  // mount so a previous selection doesn't leak in. This leaves browseSorted=false,
  // so the grid opens in the server's round-robin "waves" order (every studio's
  // nearest date, then next window, …); the price sort engages only once the
  // guest toggles it.
  useEffect(() => {
    resetRoomsFilters()
  }, [resetRoomsFilters])

  // GA4 view_item_list — the browse listing (no dates) was shown. The feed
  // repeats each studio across several date windows — dedupe by type so the
  // list event names each studio once, and cap the payload so a big grid
  // doesn't bloat the event.
  useEffect(() => {
    if (!cards.length) return
    const unique = Array.from(new Map(cards.map((c) => [c.id, c])).values())
    return whenGtagReady(() => trackViewItemList({
      items: unique.slice(0, 20).map((c) => ({ item_id: c.id, item_name: c.name })),
    }))
  }, [cards])

  const filtered = useMemo(() => {
    // Filter first (order-preserving) so the bed-size / balcony / room-type
    // toggles apply in every mode.
    const base = cards.filter((c) => {
      if (filter === 'balcony' && !c.attributes?.includes('balcony')) return false
      if (filter === 'terrace' && !c.attributes?.includes('terrace')) return false
      if (filter === 'shared' && !c.attributes?.includes('shared')) return false
      if (bedSizeFilter === 'king' && !c.attributes?.includes('king')) return false
      if (bedSizeFilter === 'queen' && !c.attributes?.includes('queen')) return false
      if (bedSizeFilter === 'single' && !c.attributes?.includes('single')) return false
      if (roomTypeFilter && !c.name.toLowerCase().includes(roomTypeFilter.toLowerCase())) return false
      return true
    })

    // Default: keep the server's round-robin "waves" order — every studio at its
    // nearest date, then every studio at its next window, … Only once the guest
    // toggles the price sort do we flatten the feed into a cheapest/priciest list.
    if (!browseSorted) return base

    return [...base].sort((a, b) => {
      // Unpriced cards (no published rate, e.g. on preview) always sink to the
      // bottom regardless of sort direction.
      const aZero = !(a.oneNightPrice > 0)
      const bZero = !(b.oneNightPrice > 0)
      if (aZero !== bZero) return aZero ? 1 : -1
      if (aZero && bZero) return 0
      return priceFilter ? a.oneNightPrice - b.oneNightPrice : b.oneNightPrice - a.oneNightPrice
    })
  }, [cards, browseSorted, priceFilter, filter, bedSizeFilter, roomTypeFilter])

  return (
    <>
      <Filters showBabyBed={false} />
      {filtered.length === 0 ? (
        <NoRooms />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <RoomCard key={`${item.id}-${item.arrival ?? ''}`} item={item} locale={locale} translations={translations} />
          ))}
        </div>
      )}
    </>
  )
}

export default RoomsBrowseList
