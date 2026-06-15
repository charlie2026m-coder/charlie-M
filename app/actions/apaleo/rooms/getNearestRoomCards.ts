import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import { getNearestAvailableRooms } from '@/app/actions/apaleo/rooms/getNearestAvailableRooms'
import { roomsDetails } from '@/content/RoomsDetails'
import type { HomeRoomCard } from '@/types/offers'

/**
 * One showcase card per available room type at its NEAREST free night with that
 * night's price. Metadata comes from Supabase `rooms` (preferred — localized
 * titles + photos), falling back to the static `content/RoomsDetails` catalog so
 * a room that's free in Apaleo but not yet seeded still appears.
 *
 * Shared by the landing-page "Choose Room" carousel (RoomsSection) and the
 * /rooms browse view (when no dates are chosen yet), so a visitor immediately
 * sees that rooms exist + prices instead of an empty fixed-date result.
 */
export async function getNearestRoomCards(locale: string): Promise<HomeRoomCard[]> {
  const [roomDetails, nearest] = await Promise.all([
    getRoomDetails(),
    getNearestAvailableRooms(),
  ])

  const supaById = new Map(roomDetails.map((r) => [r.id, r]))
  const contentById = new Map(roomsDetails.map((r) => [r.id, r]))

  return nearest
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
}
