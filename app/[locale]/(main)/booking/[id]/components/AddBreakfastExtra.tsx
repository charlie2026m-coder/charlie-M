'use client'

/**
 * Breakfast in the booking flow.
 *
 * Two jobs the generic extra modal cannot do: show the guest WHAT is served on
 * each morning of their stay, and let them pick a menu per morning.
 *
 * Pricing is deliberately untouched — persons x nights x catalogue price,
 * exactly as AddUnlimitedExtra computes it, writing the same two RoomExtras
 * (food at 7%, beverages at 19%). Choosing individual mornings would change the
 * amount, and the server re-prices a dated service at one unit per date
 * (payments-validation: "UI enforces count=1 per date"), so per-morning
 * quantities would be rejected as a mismatch at capture. That is a money-path
 * change and belongs in its own pass.
 *
 * The menu choice carries no money. It is kept on the RoomExtra as
 * `breakfastMenus`, waiting for the half of the wiring that does not exist yet:
 * NOTHING server-side reads it. A reservation id is the first thing the choice
 * could be attached to and that only exists once the Adyen webhook has created
 * the booking, so until a webhook step writes it through chooseBreakfast(), a
 * menu picked here lives only in the browser store and the guest chooses again
 * from the link we send. The modal is honest about that — "you can also choose
 * or change your menu later from the link we send you" — but it is a gap, not a
 * design.
 *
 * Menus are shown per MORNING. Apaleo bills breakfast by the night and the
 * guest eats it the next day, so the mornings of a stay run from the day after
 * arrival through departure day. See lib/breakfastDates.ts.
 */

import { FaPlus } from 'react-icons/fa6'
import { LuChevronDown } from 'react-icons/lu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from '@/app/_components/ui/dialog'
import { Button } from '@/app/_components/ui/button'
import { useEffect, useMemo, useState } from 'react'
import { Service } from '@/types/apaleo'
import { useBookingStore } from '@/store/useBookingStore'
import { Room, RoomExtra } from '@/types/types'
import { useTranslations, useLocale } from 'next-intl'
import { trackSelectExtra } from '@/lib/analytics'
import { breakfastMorningsForStay } from '@/lib/breakfastDates'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'
import { MenuPicker, sumSplit, type MenuSplit } from '@/app/_components/breakfast/MenuPicker'

interface MenuOption {
  code: string
  icon: string
  name: string
  description: string
  items: string[]
  allergens: string
}

interface MorningMenus {
  morning: string
  menus: MenuOption[]
}

const AddBreakfastExtra = ({
  extra,
  rooms,
  nights,
  bundleServices,
}: {
  extra: Service
  rooms: Room[]
  nights: number
  bundleServices?: Service[]
}) => {
  const t = useTranslations('bookingForm')
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const editRoom = useBookingStore(state => state.editRoom)

  // The display card is the bundle; the real services are booked separately so
  // each keeps its own VAT rate.
  const servicesToWrite = bundleServices && bundleServices.length > 0 ? bundleServices : [extra]
  const savedId = servicesToWrite[0].id

  const stayFrom = rooms[0]?.from ?? ''
  const stayTo = rooms[0]?.to ?? ''
  const mornings = useMemo(() => breakfastMorningsForStay(stayFrom, stayTo), [stayFrom, stayTo])

  const [calendar, setCalendar] = useState<MorningMenus[] | null>(null)
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({})
  // roomId -> morning -> how many of the party take each menu
  const [roomMenus, setRoomMenus] = useState<Record<string, Record<string, MenuSplit>>>({})

  const maxFor = (room: Room) => room.adults + room.children

  const readSaved = () => {
    const counts: Record<string, number> = {}
    const menus: Record<string, Record<string, MenuSplit>> = {}
    rooms.forEach(room => {
      const saved = room.extras?.find(e => e.id === savedId)
      counts[room.id] = saved?.count ?? 0
      menus[room.id] = Object.fromEntries(
        (saved?.breakfastMenus ?? []).map(m => [m.morning, { ...m.menus }]),
      )
    })
    return { counts, menus }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) return
    const { counts, menus } = readSaved()
    setRoomCounts(counts)
    setRoomMenus(menus)
  }

  // Fetched only while the dialog is open: most guests never open it, and the
  // calendar is the same for everyone, so the route caches it for five minutes.
  useEffect(() => {
    if (!isOpen || mornings.length === 0 || calendar) return
    const from = mornings[0]
    const to = mornings[mornings.length - 1]
    let cancelled = false
    fetch(`/api/public/breakfast/menus?from=${from}&to=${to}&locale=${locale}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!cancelled && json?.ok) setCalendar(json.mornings as MorningMenus[])
      })
      .catch(() => {
        // A calendar we cannot load must not block the sale: the guest can still
        // buy breakfast and pick the menu later from the link we send them.
        if (!cancelled) setCalendar([])
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, mornings, calendar, locale])

  // Every distinct menu that appears anywhere in this stay, in calendar order.
  // Deduplicated by code so the description block below stays one copy even
  // though the same menu is on offer every morning.
  const menuLegend: MenuOption[] = useMemo(() => {
    const seen = new Map<string, MenuOption>()
    for (const day of calendar ?? []) {
      for (const menu of day.menus) if (!seen.has(menu.code)) seen.set(menu.code, menu)
    }
    return [...seen.values()]
  }, [calendar])

  const menusOn = (morning: string) => calendar?.find(c => c.morning === morning)?.menus ?? []

  const totalCount = Object.values(roomCounts).reduce((sum, c) => sum + c, 0)
  const totalPrice = Math.round(extra.price * totalCount * nights * 100) / 100

  /**
   * How many of the room's guests are having breakfast.
   *
   * Stated outright rather than counted up with plus and minus: "for two
   * guests" is the question being asked, and a stepper made the guest read a
   * bare number and work out what it referred to.
   */
  const setCount = (roomId: string, next: number) => {
    const current = roomCounts[roomId] ?? 0
    if (next === current) return
    if (current === 0 && next > 0) trackSelectExtra({ name: extra.name, price: extra.price })
    setRoomCounts(prev => ({ ...prev, [roomId]: next }))
    // Fewer breakfasts means portions too many on file. Trimming here keeps
    // what is shown and what is stored the same thing.
    setRoomMenus(prev => {
      const byMorning = prev[roomId]
      if (!byMorning) return prev
      return {
        ...prev,
        [roomId]: Object.fromEntries(
          Object.entries(byMorning).map(([morning, split]) => [morning, trimSplit(split, next)]),
        ),
      }
    })
  }

  const pickMenu = (roomId: string, morning: string, split: MenuSplit) =>
    setRoomMenus(prev => ({ ...prev, [roomId]: { ...(prev[roomId] ?? {}), [morning]: split } }))

  const handleConfirm = () => {
    const writeIds = servicesToWrite.map(s => s.id)
    rooms.forEach(room => {
      const count = roomCounts[room.id] ?? 0
      const kept = (room.extras ?? []).filter(e => !writeIds.includes(e.id))

      if (count <= 0) {
        editRoom(room.id, { ...room, extras: kept })
        return
      }

      // Only mornings that actually have a menu on offer are stored: a choice
      // for a morning the kitchen is closed would be a promise we cannot keep.
      // Half-made choices are left out too — a split that does not add up to the
      // party would be refused when it is applied, and the guest can finish it
      // from the link we send them.
      const chosen = Object.entries(roomMenus[room.id] ?? {})
        .filter(([morning, split]) => mornings.includes(morning) && sumSplit(split) === count)
        .map(([morning, split]) => ({ morning, menus: { ...split } }))
        .sort((a, b) => a.morning.localeCompare(b.morning))

      const newExtras: RoomExtra[] = servicesToWrite.map(svc => ({
        ...svc,
        count,
        totalPrice: Math.round(svc.price * count * nights * 100) / 100,
        // Attached to both halves so neither can be dropped independently and
        // leave the choice orphaned; the webhook reads whichever it meets first.
        breakfastMenus: chosen,
      }))

      editRoom(room.id, { ...room, extras: [...kept, ...newExtras] })
    })

    setIsOpen(false)
  }

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`))

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild className='ml-auto md:ml-0'>
        <div className='self-start md:self-auto'>
          <div className='flex md:hidden items-center justify-center rounded transition-all duration-300 cursor-pointer size-10 shadow-lg bg-blue border-blue text-white'>
            <FaPlus className='size-6' />
          </div>
          <Button variant='outline' className='hidden md:block h-[35px] p-0 w-full'>{t('add')}</Button>
        </div>
      </DialogTrigger>

      <DialogContent className='max-h-[85dvh] overflow-y-auto sm:max-w-[640px]'>
        <DialogHeader>
          <DialogTitle>
            {extra.name} (€{extra.price})
          </DialogTitle>
        </DialogHeader>

        {extra.description && <p className='text-sm text-mute'>{extra.description}</p>}

        {/* How many guests, said in words. A stepper showed a bare number and
            left the guest to work out what it counted. */}
        <div className='mt-4 border-t pt-4'>
          {rooms.map((room, index) => {
            const max = maxFor(room)
            const count = roomCounts[room.id] ?? 0
            return (
              <div key={room.id} className='py-2'>
                <div className='font-medium'>
                  {rooms.length > 1 ? `${t('room')} ${index + 1}` : extra.name}
                </div>
                <div className='mb-2 text-sm text-mute'>
                  €{extra.price} × {nights} × {t('guests')}
                </div>
                <div className='grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-1.5 sm:flex sm:flex-wrap'>
                  {Array.from({ length: max + 1 }, (_, n) => n).map(n => {
                    const picked = count === n
                    return (
                      <button
                        key={n}
                        type='button'
                        onClick={() => setCount(room.id, n)}
                        aria-pressed={picked}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          picked
                            ? 'border-dark-gold bg-blue text-mute'
                            : 'border-transparent bg-black/[0.04] hover:bg-black/[0.07]'
                        }`}
                      >
                        {n === 0
                          ? t('breakfastForNone')
                          : n === 1
                            ? t('breakfastForOne')
                            : t('breakfastForMany', { count: n })}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* What is served, and the guest's pick per morning. Shown only once
            breakfast is actually in the basket — an empty basket has nothing to
            choose a menu for. */}
        {totalCount > 0 && mornings.length > 0 && (
          <div className='mt-4 border-t pt-4'>
            <h4 className='mb-1 text-xs font-medium uppercase tracking-[0.14em] text-mute'>
              {t('breakfastMenuTitle')}
            </h4>
            <p className='mb-3 text-sm text-mute'>{t('breakfastMenuHint')}</p>

            {calendar === null ? (
              <p className='text-sm text-mute'>{t('loading')}</p>
            ) : (
              rooms
                .filter(room => (roomCounts[room.id] ?? 0) > 0)
                .map((room, index) => (
                  <div key={room.id} className='mb-4'>
                    {rooms.length > 1 && (
                      <div className='mb-2 text-sm font-medium'>
                        {t('room')} {index + 1}
                      </div>
                    )}

                    {/* Every morning of the stay, always visible. It was once
                        one collapsed choice for the whole stay with the dates a
                        tap away; the dates are the thing the guest came to see,
                        so they are not hidden behind anything. */}
                    <div className='divide-y rounded-lg border'>
                      {mornings.map(morning => {
                        const options = menusOn(morning)
                        return (
                          <div
                            key={morning}
                            className='flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4'
                          >
                            <div className='shrink-0 text-sm font-medium sm:w-24'>
                              {dateLabel(morning)}
                            </div>
                            {options.length === 0 ? (
                              <div className='text-sm text-mute'>{t('breakfastMenuNone')}</div>
                            ) : (
                              <MenuPicker
                                options={options}
                                persons={roomCounts[room.id] ?? 1}
                                value={roomMenus[room.id]?.[morning] ?? {}}
                                onChange={split => pickMenu(room.id, morning, split)}
                                randomLabel={t('breakfastMenuRandom')}
                                chosenLabel={(count, total) =>
                                  t('breakfastMenuChosen', { count, total })
                                }
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
            )}

            {/* The menus themselves, described once and closed by default —
                the guest opens it if they want to know what is in "Hearty",
                and otherwise it costs them no screen at all. Deduplicated
                across mornings by code, so a day-specific menu still appears. */}
            {calendar !== null && menuLegend.length > 0 && (
              <details className='group mt-3 rounded-lg border p-3'>
                {/* The native marker is a 6px triangle nobody reads as "this
                    opens". A full-width row with a chevron that turns does. */}
                <summary className='flex cursor-pointer list-none items-center justify-between gap-2 text-sm text-mute [&::-webkit-details-marker]:hidden'>
                  <span className='underline underline-offset-2'>{t('breakfastMenuWhatsIn')}</span>
                  <LuChevronDown
                    className='h-4 w-4 shrink-0 transition-transform group-open:rotate-180'
                    aria-hidden
                  />
                </summary>
                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                  {menuLegend.map(menu => (
                    <div key={menu.code}>
                      <div className='flex items-center gap-2 text-sm font-medium'>
                        <MenuIcon name={menu.icon} className='h-4 w-4 shrink-0' />
                        {menu.name}
                      </div>
                      {menu.items.length > 0 && (
                        <div className='mt-1 text-xs leading-snug'>{menu.items.join(' · ')}</div>
                      )}
                      {menu.allergens && (
                        <div className='mt-1 text-[11px] text-mute'>
                          {t('breakfastAllergens')}: {menu.allergens}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
            <p className='mt-3 text-xs text-mute'>{t('breakfastMenuLater')}</p>
          </div>
        )}

        <div className='mt-4 flex items-center justify-between gap-3 border-t pt-4'>
          <span className='whitespace-nowrap text-sm'>
            {t('total')}: {totalCount}
          </span>
          <Button onClick={handleConfirm} className='h-[45px] min-w-0 flex-1 sm:min-w-[180px] sm:flex-none'>
            {t('confirm')} € {totalPrice.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Drop portions until the split fits `max` people, oldest choices first. */
const trimSplit = (split: MenuSplit, max: number): MenuSplit => {
  const out: MenuSplit = {}
  let left = max
  for (const [code, n] of Object.entries(split ?? {})) {
    if (left <= 0) break
    const take = Math.min(n, left)
    if (take > 0) out[code] = take
    left -= take
  }
  return out
}

export default AddBreakfastExtra
