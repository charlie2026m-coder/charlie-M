# City Tax & VAT Implementation Guide

This document describes how city tax and VAT are handled across the codebase.
Use it to replicate the same changes in another copy of the project.

---

## Core Principle

**City tax is baked into all price fields.** It is never calculated separately for display or payment — it is simply added to the room price once, at the data-fetching layer.

---

## 1. Data Fetching Layer

### `services/getSingleRoom.ts` and `services/apaleo/getRooms.ts`

**What changed:** City tax is added to the total price when building the room object.

```ts
const cityTax = room.cityTaxes?.[0]?.totalGrossAmount?.amount ?? 0;
const cityTaxForTwo = doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount ?? cityTax;

const price = Math.round(((room.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100;
const priceForTwo = Math.round(((doubleRoom?.totalGrossAmount?.amount ?? room.totalGrossAmount?.amount ?? 0) + cityTaxForTwo) * 100) / 100;
```

Also add a `taxes` object to the returned room:

```ts
taxes: {
  vatTax: room.taxDetails?.[0]?.tax?.amount ?? 0,
  cityTax,
  cityTaxForTwo,
},
```

> Note: `totalGrossAmount` from Apaleo is the total for the **entire stay** (all nights).
> `cityTaxes[0].totalGrossAmount` is also the total city tax for the **entire stay**.
> No multiplication by nights needed — just add them together.

---

### `services/apaleo/getRoomPrice.ts`

Same pattern. Also update the `RoomPriceOffer` type:

```ts
export type RoomPriceOffer = {
  // ...
  taxes: { vatTax: number; cityTax: number; cityTaxForTwo: number };
};
```

In the mapping function:

```ts
const cityTax = room.cityTaxes?.[0]?.totalGrossAmount?.amount ?? 0;
const cityTaxForTwo = doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount ?? cityTax;

const totalPrice = Math.round(((room.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100;
const totalPriceForTwo = Math.round(((doubleRoom?.totalGrossAmount?.amount ?? ...) + cityTaxForTwo) * 100) / 100;

const nights = room.timeSlices?.length || 1;

return {
  // ...
  averagePrice: Math.round((totalPrice / nights) * 100) / 100,
  averagePriceForTwo: Math.round((totalPriceForTwo / doubleNights) * 100) / 100,
  taxes: {
    vatTax: room.taxDetails?.[0]?.tax?.amount ?? 0,
    cityTax,
    cityTaxForTwo,
  },
};
```

---

### `services/apaleo/getPrices.ts` (room listing / minimum price display)

Minimum per-night price = room price for that night + city tax for that night:

```ts
const cityTaxDates = offer.cityTaxes?.[0]?.dates ?? [];
const perNightPrices = offer.timeSlices
  .map((s, i) => (s.totalGrossAmount?.amount ?? 0) + (cityTaxDates[i]?.amount?.grossAmount ?? 0))
  .filter((p) => p > 0);

priceByRoom.set(roomId, Math.min(...perNightPrices));
```

---

## 2. Price Display Logic

### Room price calculation (for display)

Used in `BookingMenu`, `SummaryCard`, and `BookingForm`. City tax is already in `price` / `priceForTwo`, so just use them directly:

```ts
const calculateRoomPrice = (adultsCount: number) => {
  const maxPersons = roomDetails.maxPersons || 2;

  if (adultsCount === 1) {
    return price; // single room price (includes cityTax)
  } else if (adultsCount % 2 === 0) {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    return roomsNeeded * priceForTwo;
  } else {
    // odd number: floor(n/2) double rooms + 1 single room
    const doubleRooms = Math.floor(adultsCount / 2);
    return (doubleRooms * priceForTwo) + price;
  }
};
```

### `BookingForm` — per-night average price (uses `averagePrice` / `averagePriceForTwo`)

```ts
const calculatePrice = (adultsCount: number, nightsCount: number) => {
  if (!room) return 0;
  const maxPersons = room.maxPersons || 2;
  const avgPrice = room.averagePrice || 0;
  const avgPriceForTwo = room.averagePriceForTwo || avgPrice;

  if (adultsCount === 1) {
    return avgPrice * nightsCount;
  } else if (adultsCount % 2 === 0) {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    return roomsNeeded * avgPriceForTwo * nightsCount;
  } else {
    const doubleRooms = Math.floor(adultsCount / 2);
    return (doubleRooms * avgPriceForTwo + avgPrice) * nightsCount;
  }
};
```

---

## 3. TaxesInfo Component (`app/_components/ui/Taxes.tsx`)

**What changed:** Component no longer calculates anything internally. It accepts pre-computed totals.

```ts
interface TaxesInfoProps {
  taxes: { vatTax: number; cityTax: number } | null | undefined
  className?: string
}
```

Remove `adults` prop and `cityTaxForTwo` logic — just display what is passed.

---

## 4. `calculateTotalTaxes` Utility (`lib/utils.ts`)

New utility function for computing total VAT and city tax across multiple rooms:

```ts
export const calculateTotalTaxes = (
  rooms: { adults: number }[],
  taxes: { vatTax: number; cityTax: number; cityTaxForTwo: number },
  maxPersons: number,
): { vatTax: number; cityTax: number } => {
  const { vatTax, cityTax, cityTaxForTwo } = taxes;

  const totalCityTax = rooms.reduce((acc, room) => {
    const a = room.adults;
    if (a === 1) return acc + cityTax;
    if (a % 2 === 0) return acc + Math.ceil(a / maxPersons) * cityTaxForTwo;
    return acc + Math.floor(a / 2) * cityTaxForTwo + cityTax;
  }, 0);

  const totalPhysicalRooms = rooms.reduce((acc, room) => {
    const a = room.adults;
    if (a <= 1) return acc + 1;
    if (a % 2 === 0) return acc + a / 2;
    return acc + Math.floor(a / 2) + 1;
  }, 0);

  return {
    vatTax: Math.round(vatTax * totalPhysicalRooms * 100) / 100,
    cityTax: Math.round(totalCityTax * 100) / 100,
  };
};
```

**Usage in components:**

```tsx
// BookingMenu / SummaryCard (multiple rooms)
const totalTaxes = roomDetails.taxes
  ? calculateTotalTaxes(rooms, roomDetails.taxes, maxPersons)
  : null;
<TaxesInfo taxes={totalTaxes} className='mb-3' />

// BookingForm (single guest selection)
<TaxesInfo
  taxes={calculateTotalTaxes([{ adults: guests.adults }], room.taxes, room.maxPersons || 2)}
  className='mt-2'
/>
```

> This is for **display only** (tooltip). It does not affect payment amounts.

---

## 5. Payment Payload (`lib/utils.ts` → `formatReservations`)

**What changed:** Removed separate city tax from `reservationAmount`.

Before (wrong — double-counted city tax):
```ts
const reservationAmount = Math.round((roomPrice + roomTax + extrasTotalPrice) * 100) / 100
```

After (correct — city tax already in roomPrice):
```ts
const reservationAmount = Math.round((roomPrice + extrasTotalPrice) * 100) / 100
```

Also remove `calculateRoomTax`, `cityTax`, `cityTaxForTwo` variables from `formatReservations` entirely.

---

## 6. Rate Plan Selection (`lib/Constants.ts`)

**What changed:** Added `resolveRatePlan` — single generic function used everywhere to pick the correct rate plan. Never picks a random room.

```ts
export const resolveRatePlan = <T extends { ratePlan: { code: string } }>(
  rooms: T[],
  nights: number,
  isRefundable: boolean,
): T | null => {
  const preferred = isRefundable
    ? getRatePlanByNights(nights)       // FLEX_WEB3 / FLEX_WEB2 / FLEX_WEB
    : getNonRefundableRatePlanByNights(nights); // NR_WEB3 / NR_WEB2 / NR_WEB
  const base = isRefundable ? RATE_PLANS.FLEX_WEB : RATE_PLANS.NR_WEB;

  return (
    rooms.find(r => r.ratePlan.code === preferred) ??
    (preferred !== base ? rooms.find(r => r.ratePlan.code === base) ?? null : null)
  );
};
```

**Rules:**
- Default is always `FLEX_WEB`
- 2 nights → prefer `FLEX_WEB2`, fall back to `FLEX_WEB`
- 3+ nights → prefer `FLEX_WEB3`, fall back to `FLEX_WEB`
- Non-refundable: same logic with `NR_WEB` / `NR_WEB2` / `NR_WEB3`
- No match → `null` (room unavailable — never pick random)

**Usage:**

```ts
// BookingForm.tsx — always refundable
const room = data ? resolveRatePlan(data.rooms, nights, true) : null;

// BookingPage.tsx — always refundable on initial load
const mainRoom = resolveRatePlan(rooms, nights, true);

// RefundCard.tsx — depends on user's refundable toggle
const mainRoom = resolveRatePlan(rooms, nights, isRefundable);
if (!mainRoom) return; // no fallback — room simply unavailable
```

---

## 7. Type Changes (`types/offers.ts`)

### `TaxDetail` — fixed to match actual Apaleo response

```ts
interface TaxDetail {
  vatType: string;
  vatPercent: number;
  net: { amount: number; currency: string };
  tax: { amount: number; currency: string }; // use tax.amount for vatTax
}
```

### `RoomOffer` — add `taxes` field

```ts
export interface RoomOffer {
  // ... existing fields
  taxes?: { vatTax: number; cityTax: number; cityTaxForTwo: number };
}
```

---

## 8. Room Card Price Display (`app/[locale]/rooms/components/RoomCard.tsx`)

**What changed:** Shows total price for the selected period using `oneNightPrice` / `oneNightPriceForTwo` (city tax already included) multiplied by nights:

```ts
const nights = queryParams.from && queryParams.to
  ? calculateNights(queryParams.from, queryParams.to)
  : 1;

const pricePerNight = adultsCount >= maxPersons
  ? (room.oneNightPriceForTwo || room.oneNightPrice || 0)
  : (room.oneNightPrice || 0);

const price = roomsNeeded * pricePerNight * nights;
```

> `oneNightPrice` / `oneNightPriceForTwo` are set in `getSingleRoom.ts` as `price / nights` — total price with city tax divided by number of nights.

---

## Summary of Changes by File

| File | Change |
|---|---|
| `services/getSingleRoom.ts` | `price` = `totalGrossAmount + cityTax`; add `taxes` object |
| `services/apaleo/getRooms.ts` | Same as above |
| `services/apaleo/getRoomPrice.ts` | Same; add `cityTaxForTwo` to `RoomPriceOffer.taxes` type |
| `services/apaleo/getPrices.ts` | Min price = `timeSlice[i] + cityTaxDate[i]` |
| `types/offers.ts` | Fix `TaxDetail` shape; add `taxes` field to `RoomOffer` |
| `lib/Constants.ts` | Add `resolveRatePlan` generic function |
| `app/_components/ui/Taxes.tsx` | Remove `adults` prop; accept pre-computed totals |
| `lib/utils.ts` | Add `calculateTotalTaxes`; remove `calculateRoomTax` + `roomTax` from `formatReservations` |
| `app/[locale]/rooms/components/RoomCard.tsx` | Show total price for selected period (price × nights) |
| `app/[locale]/rooms/[id]/components/BookingForm.tsx` | Fix `calculatePrice` for mixed rooms; use `resolveRatePlan`; use `calculateTotalTaxes` |
| `app/[locale]/booking/[id]/components/BookingPage.tsx` | Use `resolveRatePlan` instead of manual plan selection |
| `app/[locale]/booking/[id]/components/RefundCard.tsx` | Use `resolveRatePlan`; return early if no plan found |
| `app/[locale]/booking/[id]/components/BookingMenu.tsx` | Use `calculateTotalTaxes` for `TaxesInfo` |
| `app/[locale]/booking/[id]/components/SummaryCard.tsx` | Same |


  Шаг 1 — Types (types/offers.ts) — Fix TaxDetail, add taxes to RoomOffer                                                        
  Шаг 2 — Data fetching (services/getSingleRoom.ts, services/apaleo/rooms.ts) — city tax + price                                 
  Шаг 3 — app/actions/apaleo/rooms/getRoomPrice.ts — city tax + taxes в тип                                                      
  Шаг 4 — app/actions/apaleo/rooms/getPrices.ts — min price per night with city tax             
  Шаг 5 — lib/utils.ts — add calculateTotalTaxes, fix formatReservations                                                         
  Шаг 6 — lib/Constants.ts — add resolveRatePlan                                                                                 
  Шаг 7 — app/_components/ui/Taxes.tsx — remove adults, pre-computed taxes                                                       
  Шаг 8 — Компоненты (BookingForm, BookingPage, RefundCard, BookingMenu, SummaryCard, RoomCard) 