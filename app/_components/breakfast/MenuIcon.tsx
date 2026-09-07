'use client'

/**
 * The little picture beside a breakfast menu.
 *
 * The database stores an icon NAME (`croissant`), not the picture itself. That
 * keeps the menus editable by the kitchen without a deploy — the original
 * reason the column exists — while the drawing stays a line icon from the same
 * family as the rest of the site instead of an emoji, which renders as a
 * different cartoon on every phone and never matches the design.
 *
 * A name the map does not know falls back to a neutral plate rather than
 * disappearing, so a typo in the admin costs the kitchen a wrong icon and not
 * a broken row. An empty name renders nothing at all — that is how a menu opts
 * out of having an icon.
 */

import type { IconType } from 'react-icons'
import {
  LuApple,
  LuBeef,
  LuCakeSlice,
  LuCarrot,
  LuCherry,
  LuCoffee,
  LuCookie,
  LuCroissant,
  LuCupSoda,
  LuEgg,
  LuEggFried,
  LuFish,
  LuIceCreamCone,
  LuLeaf,
  LuMilk,
  LuSalad,
  LuSandwich,
  LuSoup,
  LuUtensils,
  LuWheat,
} from 'react-icons/lu'

const ICONS: Record<string, IconType> = {
  apple: LuApple,
  beef: LuBeef,
  'cake-slice': LuCakeSlice,
  carrot: LuCarrot,
  cherry: LuCherry,
  coffee: LuCoffee,
  cookie: LuCookie,
  croissant: LuCroissant,
  'cup-soda': LuCupSoda,
  egg: LuEgg,
  'egg-fried': LuEggFried,
  fish: LuFish,
  'ice-cream-cone': LuIceCreamCone,
  leaf: LuLeaf,
  milk: LuMilk,
  salad: LuSalad,
  sandwich: LuSandwich,
  soup: LuSoup,
  utensils: LuUtensils,
  wheat: LuWheat,
}

/** The names the admin may put in `breakfast_menus.icon`. */
export const MENU_ICON_NAMES = Object.keys(ICONS)

export function MenuIcon({ name, className }: { name: string; className?: string }) {
  const key = name.trim().toLowerCase()
  if (!key) return null
  const Icon = ICONS[key] ?? LuUtensils
  return <Icon className={className} aria-hidden />
}
