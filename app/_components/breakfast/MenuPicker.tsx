'use client'

/**
 * Choosing breakfast for a party, shared by the booking modal and the guest
 * page the Guestway link opens. The same choice on both surfaces should look
 * like the same choice.
 *
 * A room is not one appetite: two people on one reservation may want the eggs
 * and the vegan bowl on the same morning. So the value is a SPLIT — how many of
 * the party take each menu — and not a single code.
 *
 * One traveller gets pills, because "how many of you want the croissant" is a
 * silly question when the answer can only be one. From two people up the pills
 * become counted rows, the same minus/plus control the modal already uses for
 * the number of breakfasts, and the choice is complete only when every portion
 * is accounted for.
 */

import { LuDices } from 'react-icons/lu'
import { MenuIcon } from './MenuIcon'
import { ButtonIcon } from '@/app/_components/ui/ButtonIcon'

export interface ChipMenu {
  code: string
  icon: string
  name: string
  /** A picture of the plate, when the kitchen has uploaded one. */
  photoUrl?: string | null
}

/** The picture if there is one, the icon if not — same footprint either way. */
function MenuMark({ menu, size }: { menu: ChipMenu; size: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-6 w-6' : 'h-9 w-9'
  if (menu.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={menu.photoUrl}
        alt=''
        loading='lazy'
        className={`${box} shrink-0 rounded-full object-cover`}
      />
    )
  }
  return <MenuIcon name={menu.icon} className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} shrink-0`} />
}

/** How many of the party take each menu, e.g. `{ A: 1, B: 1 }`. */
export type MenuSplit = Record<string, number>

export const sumSplit = (split: MenuSplit): number =>
  Object.values(split ?? {}).reduce((total, n) => total + (Number(n) || 0), 0)

/**
 * A split chosen at random for a guest who does not mind which it is.
 *
 * For one traveller it never lands on the menu already chosen — a button that
 * can leave everything exactly as it was reads as broken. For a party each
 * portion is rolled separately, so two people are as likely to get one of each
 * as two of the same.
 */
export function randomSplit(
  options: readonly ChipMenu[],
  persons: number,
  current?: MenuSplit,
): MenuSplit {
  if (options.length === 0) return {}
  const roll = (pool: readonly ChipMenu[]) => pool[Math.floor(Math.random() * pool.length)].code

  if (persons <= 1) {
    const chosen = Object.keys(current ?? {}).find(code => (current ?? {})[code] > 0)
    const pool = options.filter(o => o.code !== chosen)
    return { [roll(pool.length > 0 ? pool : options)]: 1 }
  }

  const next: MenuSplit = {}
  for (let i = 0; i < persons; i++) {
    const code = roll(options)
    next[code] = (next[code] ?? 0) + 1
  }
  return next
}

const chipBase =
  'inline-flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60'

function RandomButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      // Dashed and never filled: this is an action, not another menu, and it
      // must not look selected once it has done its work.
      className={`${chipBase} border-dashed border-dark-gold text-dark hover:bg-black/[0.04]`}
    >
      <LuDices className='h-4 w-4 shrink-0' aria-hidden />
      {label}
    </button>
  )
}

export function MenuPicker({
  options,
  persons,
  value,
  onChange,
  disabled,
  randomLabel,
  chosenLabel,
}: {
  options: readonly ChipMenu[]
  /** People this morning is booked for. One means a single pill choice. */
  persons: number
  value: MenuSplit
  onChange: (split: MenuSplit) => void
  disabled?: boolean
  /** When set, a dice control is offered for the undecided guest. */
  randomLabel?: string
  /** "{count} of {total} chosen" — only used when the party is larger than one. */
  chosenLabel?: (count: number, total: number) => string
}) {
  const split = value ?? {}
  const total = sumSplit(split)

  if (persons <= 1) {
    return (
      // Below sm the pills sit in an auto-fit grid whose track is never narrower
      // than the widest name: a fixed two-column grid clipped "Continental" on a
      // 375px screen, and plain flex-wrap left a ragged right edge.
      <div className='grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-1.5 sm:flex sm:flex-wrap'>
        {options.map(menu => {
          const isPicked = (split[menu.code] ?? 0) > 0
          return (
            <button
              key={menu.code}
              type='button'
              onClick={() => onChange({ [menu.code]: 1 })}
              aria-pressed={isPicked}
              disabled={disabled}
              className={`${chipBase} ${
                isPicked
                  ? 'border-dark-gold bg-blue text-mute'
                  : 'border-transparent bg-black/[0.04] hover:bg-black/[0.07]'
              }`}
            >
              <MenuMark menu={menu} size='sm' />
              {menu.name}
            </button>
          )
        })}
        {randomLabel && options.length > 1 && (
          <RandomButton
            label={randomLabel}
            disabled={disabled}
            onClick={() => onChange(randomSplit(options, 1, split))}
          />
        )}
      </div>
    )
  }

  const setCount = (code: string, next: number) => {
    const updated = { ...split }
    if (next <= 0) delete updated[code]
    else updated[code] = next
    onChange(updated)
  }

  return (
    <div className='flex flex-col gap-1'>
      {options.map(menu => {
        const count = split[menu.code] ?? 0
        return (
          <div
            key={menu.code}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
              count > 0 ? 'bg-blue/30' : ''
            }`}
          >
            <MenuMark menu={menu} size='md' />
            <span className='min-w-0 flex-1 truncate text-sm'>{menu.name}</span>
            <ButtonIcon
              symbol='-'
              onClick={() => setCount(menu.code, count - 1)}
              disabled={disabled || count <= 0}
            />
            <span className='w-4 text-center text-sm'>{count}</span>
            <ButtonIcon
              symbol='+'
              onClick={() => setCount(menu.code, count + 1)}
              disabled={disabled || total >= persons}
            />
          </div>
        )
      })}
      <div className='mt-1 flex flex-wrap items-center justify-between gap-2'>
        <span className={`text-xs ${total === persons ? 'text-mute' : 'text-dark-gold'}`}>
          {chosenLabel ? chosenLabel(total, persons) : `${total}/${persons}`}
        </span>
        {randomLabel && (
          <RandomButton
            label={randomLabel}
            disabled={disabled}
            onClick={() => onChange(randomSplit(options, persons, split))}
          />
        )}
      </div>
    </div>
  )
}
