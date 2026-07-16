import { describe, it, expect } from 'vitest';
import {
  BREAKFAST_FOOD_ID,
  BREAKFAST_BEVERAGE_ID,
  isBreakfastFood,
  isBreakfastBeverage,
  isBreakfastPart,
  breakfastBundleLabel,
  makeBreakfastDisplayService,
  collapseBreakfastExtrasForDisplay,
} from '@/lib/breakfastBundle';
import type { Service } from '@/types/apaleo';

// The two real Apaleo services created for the VAT split (70/30 of 19.90€).
const food: Service = {
  id: BREAKFAST_FOOD_ID,
  name: 'Breakfast [Food]',
  price: 13.93, // 70% @ 7%
  currency: 'EUR',
  pricingUnit: 'Person',
  pricingType: 'Daily',
  daysOfWeek: [],
  availability: { mode: 'Daily', daysOfWeek: [] },
};
const beverage: Service = {
  id: BREAKFAST_BEVERAGE_ID,
  name: 'Breakfast [Beverages]',
  price: 5.97, // 30% @ 19%
  currency: 'EUR',
  pricingUnit: 'Person',
  pricingType: 'Daily',
  daysOfWeek: [],
  availability: { mode: 'Daily', daysOfWeek: [] },
};

describe('breakfast VAT split — money invariant', () => {
  it('the two halves sum to the advertised gross price with no float drift', () => {
    const cents = Math.round(food.price * 100) + Math.round(beverage.price * 100);
    expect(cents).toBe(1990); // 19.90 €
  });
});

describe('predicates', () => {
  it('classify each half and reject unrelated ids', () => {
    expect(isBreakfastFood(BREAKFAST_FOOD_ID)).toBe(true);
    expect(isBreakfastBeverage(BREAKFAST_BEVERAGE_ID)).toBe(true);
    expect(isBreakfastPart(BREAKFAST_FOOD_ID)).toBe(true);
    expect(isBreakfastPart(BREAKFAST_BEVERAGE_ID)).toBe(true);
    expect(isBreakfastPart('CMH-PRK')).toBe(false);
    expect(isBreakfastPart(undefined)).toBe(false);
  });
});

describe('breakfastBundleLabel', () => {
  it('localises the guest-facing label', () => {
    expect(breakfastBundleLabel('en')).toBe('Breakfast');
    expect(breakfastBundleLabel('de')).toBe('Frühstück');
    expect(breakfastBundleLabel(undefined)).toBe('Breakfast');
  });
});

describe('makeBreakfastDisplayService', () => {
  it('sums the price and shows one clean label, keeping the food id', () => {
    const card = makeBreakfastDisplayService(food, beverage, 'en');
    expect(card.id).toBe(BREAKFAST_FOOD_ID);
    expect(card.price).toBe(19.9);
    expect(card.name).toBe('Breakfast');
    // config carried from the food half so pricing multipliers stay identical
    expect(card.pricingUnit).toBe('Person');
    expect(card.availability.mode).toBe('Daily');
  });

  it('uses the German label for the /de locale', () => {
    expect(makeBreakfastDisplayService(food, beverage, 'de').name).toBe('Frühstück');
  });
});

describe('collapseBreakfastExtrasForDisplay', () => {
  it('merges the pair into one "Breakfast" line and drops the beverage row', () => {
    const extras = [
      { ...food, totalPrice: 27.86, count: 2 }, // 13.93 × 2
      { ...beverage, totalPrice: 11.94, count: 2 }, // 5.97 × 2
    ];
    const rows = collapseBreakfastExtrasForDisplay(extras, 'en');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(BREAKFAST_FOOD_ID);
    expect(rows[0].name).toBe('Breakfast');
    expect(rows[0].price).toBe(19.9);
    expect(rows[0].totalPrice).toBe(39.8); // 27.86 + 11.94
  });

  it('leaves unrelated extras untouched and keeps their order', () => {
    const parking = { id: 'CMH-PRK', name: 'Parking', price: 35, totalPrice: 35 };
    const rows = collapseBreakfastExtrasForDisplay(
      [parking, { ...food, totalPrice: 13.93 }, { ...beverage, totalPrice: 5.97 }],
      'en',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(parking);
    expect(rows[1].id).toBe(BREAKFAST_FOOD_ID);
    expect(rows[1].totalPrice).toBe(19.9);
  });

  it('is a no-op when breakfast is not in the cart', () => {
    const only = [{ id: 'CMH-PRK', name: 'Parking', price: 35, totalPrice: 35 }];
    expect(collapseBreakfastExtrasForDisplay(only, 'en')).toEqual(only);
  });

  it('does not invent a line when only the beverage half is present', () => {
    // Defensive: should never happen (both are always booked together), but a
    // lone beverage must not render as a standalone "Breakfast" line.
    const rows = collapseBreakfastExtrasForDisplay([{ ...beverage, totalPrice: 5.97 }], 'en');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(BREAKFAST_BEVERAGE_ID);
  });
});
