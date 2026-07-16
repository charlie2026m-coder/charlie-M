import type { Service } from '@/types/apaleo'

// Breakfast is split into two real Apaleo services for correct VAT: the tax
// advisor requires a 70/30 gross split — food (Speisen) at 7% and beverages
// (Getränke) at 19% — booked as two separate services. Guests must never see or
// book half a breakfast, so on the money path BOTH services stay real
// (payment validation and the Apaleo folio price each id from the catalog, so
// they sum back to the full price on their own); the two are collapsed into one
// "Breakfast" line ONLY in the presentation layer. A mistake in this module is
// therefore always cosmetic — never a charged-vs-booked mismatch.
export const BREAKFAST_FOOD_ID = 'CMH-BRKF' // 7% Speisen (70% of the price)
export const BREAKFAST_BEVERAGE_ID = 'CMH-BRKFG' // 19% Getränke (30% of the price)

export const isBreakfastFood = (id?: string): boolean => id === BREAKFAST_FOOD_ID
export const isBreakfastBeverage = (id?: string): boolean => id === BREAKFAST_BEVERAGE_ID
export const isBreakfastPart = (id?: string): boolean =>
  isBreakfastFood(id) || isBreakfastBeverage(id)

export const breakfastBundleLabel = (locale?: string): string =>
  locale === 'de' ? 'Frühstück' : 'Breakfast'

// The single "Breakfast" card guests see, built from the two catalog entries:
// summed price and clean label (the food entry keeps its id/image/description).
// The two real services travel alongside via the adder so booking still writes
// both — this object is for display only.
export function makeBreakfastDisplayService(
  food: Service,
  beverage: Service,
  locale?: string,
): Service {
  return {
    ...food,
    name: breakfastBundleLabel(locale),
    price: Math.round((food.price + beverage.price) * 100) / 100,
  }
}

// DISPLAY-ONLY collapse for the cart/summary lists: drop the beverage row and
// re-label + re-price the food row as the combined "Breakfast". Prices are
// summed from whatever each row already carries, so it stays correct for any
// guest/night multiplier. Never use this to build an Apaleo payload — the money
// path must keep both ids.
export function collapseBreakfastExtrasForDisplay<
  T extends { id: string; name?: string; price?: number; totalPrice?: number },
>(extras: readonly T[], locale?: string): T[] {
  const food = extras.find(e => isBreakfastFood(e.id))
  const beverage = extras.find(e => isBreakfastBeverage(e.id))
  // Only merge when BOTH halves are present. A lone half (an impossible state
  // through the UI) is left as-is rather than dropped, so a charged line is
  // never silently hidden.
  if (!food || !beverage) return [...extras]
  return extras
    .filter(e => !isBreakfastBeverage(e.id))
    .map(e =>
      isBreakfastFood(e.id)
        ? {
            ...e,
            name: breakfastBundleLabel(locale),
            price: (e.price ?? 0) + (beverage.price ?? 0),
            totalPrice: (e.totalPrice ?? 0) + (beverage.totalPrice ?? 0),
          }
        : e,
    )
}
