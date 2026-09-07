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
 * The menu choice carries no money. It rides in the booking payload as
 * `breakfastMenus` and is applied after the webhook creates the reservation —
 * the first moment a reservation id exists to attach it to.
 *
 * Menus are shown per MORNING. Apaleo bills breakfast by the night and the
 * guest eats it the next day, so the mornings of a stay run from the day after
 * arrival through departure day. See lib/breakfastDates.ts.
 */

import { FaPlus } from 'react-icons/fa6'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from '@/app/_components/ui/dialog'
import { Button } from '@/app/_components/ui/button'
import { ButtonIcon } from '@/app/_components/ui/ButtonIcon'
import { useEffect, useMemo, useState } from 'react'
import { Service } from '@/types/apaleo'
import { useBookingStore } from '@/store/useBookingStore'
import { Room, RoomExtra } from '@/types/types'
import { useTranslations, useLocale } from 'next-intl'
import { trackSelectExtra } from '@/lib/analytics'
import { breakfastMorningsForStay } from '@/lib/breakfastDates'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'
import { LuDices } from 'react-icons/lu'
import { MenuChips, randomMenuCode } from '@/app/_components/breakfast/MenuChips'

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
  // roomId -> morning -> menu code
  const [roomMenus, setRoomMenus] = useState<Record<string, Record<string, string>>>({})
  // The same four menus are on offer every morning of a normal stay, so the
  // default is one choice for the whole stay and this opens the per-morning
  // rows. Only meaningful when the calendar is uniform; otherwise the rows are
  // always shown, because then the days genuinely differ.
  const [perDay, setPerDay] = useState(false)

  const maxFor = (room: Room) => room.adults + room.children

  const readSaved = () => {
    const counts: Record<string, number> = {}
    const menus: Record<string, Record<string, string>> = {}
    rooms.forEach(room => {
      const saved = room.extras?.find(e => e.id === savedId)
      counts[room.id] = saved?.count ?? 0
      menus[room.id] = Object.fromEntries(
        (saved?.breakfastMenus ?? []).map(m => [m.morning, m.menuCode]),
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
    setPerDay(Object.values(menus).some(byMorning => new Set(Object.values(byMorning)).size > 1))
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

  // Does every morning of this stay offer exactly the same menus? Then asking
  // four times is asking the same question four times.
  const uniformMenus: MenuOption[] | null = useMemo(() => {
    if (calendar === null || mornings.length === 0) return null
    const first = calendar.find(c => c.morning === mornings[0])?.menus ?? []
    if (first.length === 0) return null
    const key = first.map(m => m.code).join(',')
    const same = mornings.every(
      m => (calendar.find(c => c.morning === m)?.menus ?? []).map(x => x.code).join(',') === key,
    )
    return same ? first : null
  }, [calendar, mornings])

  const totalCount = Object.values(roomCounts).reduce((sum, c) => sum + c, 0)
  const totalPrice = Math.round(extra.price * totalCount * nights * 100) / 100

  const add = (roomId: string, max: number) => {
    const current = roomCounts[roomId] ?? 0
    if (current >= max) return
    trackSelectExtra({ name: extra.name, price: extra.price })
    setRoomCounts(prev => ({ ...prev, [roomId]: current + 1 }))
  }

  const subtract = (roomId: string) => {
    const current = roomCounts[roomId] ?? 0
    if (current <= 0) return
    setRoomCounts(prev => ({ ...prev, [roomId]: current - 1 }))
  }

  const pickMenu = (roomId: string, morning: string, code: string) =>
    setRoomMenus(prev => ({ ...prev, [roomId]: { ...(prev[roomId] ?? {}), [morning]: code } }))

  const pickEveryMorning = (roomId: string, code: string) =>
    setRoomMenus(prev => ({
      ...prev,
      [roomId]: Object.fromEntries(mornings.map(m => [m, code])),
    }))

  /** The one code held by every morning, or undefined if they differ. */
  const pickedForAll = (roomId: string) => {
    const chosen = mornings.map(m => roomMenus[roomId]?.[m])
    return chosen.every(c => c && c === chosen[0]) ? chosen[0] : undefined
  }

  // For the guest who does not care which of the four it is. One tap decides
  // the whole stay — every morning of every room that has breakfast — because
  // being undecided about one morning and sure about the next is not a thing
  // anyone is. In the per-morning view it rolls separately for each day, so an
  // undecided guest gets variety rather than the same menu four times.
  const surpriseMe = () => {
    setRoomMenus(prev => {
      const next = { ...prev }
      for (const room of rooms) {
        if ((roomCounts[room.id] ?? 0) <= 0) continue
        const current = prev[room.id] ?? {}
        if (uniformMenus && !perDay) {
          const code = randomMenuCode(uniformMenus, pickedForAll(room.id))
          next[room.id] = Object.fromEntries(mornings.map(m => [m, code]))
          continue
        }
        const byMorning: Record<string, string> = { ...current }
        for (const morning of mornings) {
          const options = menusOn(morning)
          if (options.length > 0) byMorning[morning] = randomMenuCode(options, current[morning])
        }
        next[room.id] = byMorning
      }
      return next
    })
  }

  // Collapsing back to a single choice must not hide a difference it cannot
  // show, so the first morning's pick wins for the whole stay.
  const collapseToFirst = () => {
    setPerDay(false)
    setRoomMenus(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([roomId, byMorning]) => {
          const first = byMorning[mornings[0]]
          return [roomId, first ? Object.fromEntries(mornings.map(m => [m, first])) : byMorning]
        }),
      ),
    )
  }

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
      const chosen = Object.entries(roomMenus[room.id] ?? {})
        .filter(([morning]) => mornings.includes(morning))
        .map(([morning, menuCode]) => ({ morning, menuCode }))
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

        {/* Quantity — unchanged from every other daily per-person extra. */}
        <div className='mt-4 border-t pt-4'>
          {rooms.map((room, index) => {
            const max = maxFor(room)
            const count = roomCounts[room.id] ?? 0
            return (
              <div key={room.id} className='flex items-center justify-between gap-4 py-2'>
                <div className='min-w-0'>
                  <div className='font-medium'>
                    {rooms.length > 1 ? `${t('room')} ${index + 1}` : extra.name}
                  </div>
                  <div className='text-sm text-mute'>
                    €{extra.price} × {nights} × {t('guests')} (max {max})
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <ButtonIcon symbol='-' onClick={() => subtract(room.id)} disabled={count <= 0} />
                  <span className='w-4 text-center'>{count}</span>
                  <ButtonIcon symbol='+' onClick={() => add(room.id, max)} disabled={count >= max} />
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

                    {/* One choice for the whole stay when every morning offers
                        the same menus, which is the normal case: four identical
                        rows is the same question asked four times. The rows are
                        one tap away for a guest who does want to vary it, and
                        appear on their own when the days really do differ. The
                        menus themselves are described ONCE, below, behind a
                        disclosure. */}
                    {uniformMenus && !perDay ? (
                      <div className='rounded-lg border p-3'>
                        <div className='mb-2 text-sm font-medium'>
                          {t('breakfastMenuEveryMorning')}
                        </div>
                        <MenuChips
                          options={uniformMenus}
                          picked={pickedForAll(room.id)}
                          onPick={code => pickEveryMorning(room.id, code)}
                        />
                      </div>
                    ) : (
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
                                <MenuChips
                                  options={options}
                                  picked={roomMenus[room.id]?.[morning]}
                                  onPick={code => pickMenu(room.id, morning, code)}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))
            )}

            {calendar !== null && (
              <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
                <button
                  type='button'
                  onClick={surpriseMe}
                  className='inline-flex items-center gap-1.5 text-sm text-mute underline underline-offset-2'
                >
                  <LuDices className='h-4 w-4 shrink-0' aria-hidden />
                  {t('breakfastMenuRandom')}
                </button>
                {uniformMenus && (
                  <button
                    type='button'
                    onClick={() => (perDay ? collapseToFirst() : setPerDay(true))}
                    className='text-sm text-mute underline underline-offset-2'
                  >
                    {perDay ? t('breakfastMenuSameAll') : t('breakfastMenuPerDay')}
                  </button>
                )}
              </div>
            )}

            {/* The menus themselves, described once and closed by default —
                the guest opens it if they want to know what is in "Hearty",
                and otherwise it costs them no screen at all. Deduplicated
                across mornings by code, so a day-specific menu still appears. */}
            {calendar !== null && menuLegend.length > 0 && (
              <details className='mt-3 rounded-lg border p-3'>
                <summary className='cursor-pointer text-sm text-mute'>
                  {t('breakfastMenuWhatsIn')}
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

export default AddBreakfastExtra
