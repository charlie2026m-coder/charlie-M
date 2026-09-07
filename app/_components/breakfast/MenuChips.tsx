'use client'

/**
 * One row of breakfast-menu pills, shared by the booking modal and the guest
 * page the Guestway link opens. The same choice on both surfaces should look
 * like the same choice.
 *
 * Below sm the pills sit in an auto-fit grid whose track is never narrower than
 * the widest name: a fixed two-column grid clipped "Continental" on a 375px
 * screen, and plain flex-wrap left a ragged right edge. From sm up all four fit
 * on one line, so they simply flow.
 */

import { LuDices } from 'react-icons/lu'
import { MenuIcon } from './MenuIcon'

export interface ChipMenu {
  code: string
  icon: string
  name: string
}

/** A menu at random, never the one already chosen: a button that can leave
 *  everything exactly as it was reads as broken. */
export function randomMenuCode(options: readonly ChipMenu[], current?: string): string {
  const pool = options.filter(o => o.code !== current)
  const from = pool.length > 0 ? pool : options
  return from[Math.floor(Math.random() * from.length)].code
}

export function MenuChips({
  options,
  picked,
  onPick,
  disabled,
  randomLabel,
}: {
  options: readonly ChipMenu[]
  picked: string | undefined
  onPick: (code: string) => void
  disabled?: boolean
  /** When set, a dice pill is appended that picks for an undecided guest. */
  randomLabel?: string
}) {
  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-1.5 sm:flex sm:flex-wrap'>
      {options.map(menu => {
        const isPicked = picked === menu.code
        return (
          <button
            key={menu.code}
            type='button'
            onClick={() => onPick(menu.code)}
            aria-pressed={isPicked}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isPicked
                ? 'border-dark-gold bg-blue text-mute'
                : 'border-transparent bg-black/[0.04] hover:bg-black/[0.07]'
            }`}
          >
            <MenuIcon name={menu.icon} className='h-4 w-4 shrink-0' />
            {menu.name}
          </button>
        )
      })}
      {randomLabel && options.length > 1 && (
        <button
          type='button'
          onClick={() => onPick(randomMenuCode(options, picked))}
          disabled={disabled}
          // Dashed and never filled: this is an action, not a fifth menu, and it
          // must not look selected once it has done its work.
          className='inline-flex items-center gap-1.5 rounded-full border border-dashed border-dark-gold px-3 py-1.5 text-sm text-dark transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-60'
        >
          <LuDices className='h-4 w-4 shrink-0' aria-hidden />
          {randomLabel}
        </button>
      )}
    </div>
  )
}
