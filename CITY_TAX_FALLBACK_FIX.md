# City Tax Fallback Fix - 7.5%

## Problem

City tax fallback was set to `0` instead of calculating 7.5% of room price when
Apaleo doesn't provide the value.

## Solution

Added fallback calculation: `Math.round(price * CITY_TAX_RATE * 100) / 100`
where `CITY_TAX_RATE = 0.075` (7.5%)

---

## Changes

### 1. Update CITY_TAX_RATE constant

**File:** `lib/Constants.ts`

**Before:**

```typescript
export const CITY_TAX_RATE = 0.07; // 7% city tax on room prices
```

**After:**

```typescript
export const CITY_TAX_RATE = 0.075; // 7.5% city tax on room prices
```

---

### 2. Add fallback to getAvailableRooms

**File:** `services/getAvailableRooms.tsx`

**Before:**

```typescript
cityTax: room.cityTaxes?.[0]?.totalGrossAmount?.amount || 0,
cityTaxForTwo: doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || 0,
```

**After:**

```typescript
const roomPrice = room.totalGrossAmount?.amount || 0;
const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

cityTax: room.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPrice * CITY_TAX_RATE * 100) / 100,
cityTaxForTwo: doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPriceForTwo * CITY_TAX_RATE * 100) / 100,
```

**Import added:**

```typescript
import { CITY_TAX_RATE } from "@/lib/Constants";
```

---

### 3. Add fallback to getSingleRoom

**File:** `services/getSingleRoom.ts`

**Before:**

```typescript
cityTax: room.cityTaxes?.[0]?.totalGrossAmount?.amount || 0,
cityTaxForTwo: doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || 0,
```

**After:**

```typescript
const roomPrice = room.totalGrossAmount?.amount || 0;
const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

cityTax: room.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPrice * CITY_TAX_RATE * 100) / 100,
cityTaxForTwo: doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPriceForTwo * CITY_TAX_RATE * 100) / 100,
```

**Import added:**

```typescript
import { CITY_TAX_RATE } from "@/lib/Constants";
```

---

### 4. Add fallback to formatReservations

**File:** `lib/utils.ts`

**Before:**

```typescript
const cityTax = roomDetails.cityTax || 0;
const cityTaxForTwo = roomDetails.cityTaxForTwo || cityTax;
```

**After:**

```typescript
const cityTax = roomDetails.cityTax ||
  Math.round(price * CITY_TAX_RATE * 100) / 100;
const cityTaxForTwo = roomDetails.cityTaxForTwo ||
  Math.round(priceForTwo * CITY_TAX_RATE * 100) / 100;
```

**Import updated:**

```typescript
import { CITY_TAX_RATE, RATE_PLANS } from "./Constants";
```

---

### 5. Add fallback to BookingMenu

**File:** `app/[locale]/booking/[id]/components/BookingMenu.tsx`

**Before:**

```typescript
const cityTax = roomDetails.cityTax || 0;
const cityTaxForTwo = roomDetails.cityTaxForTwo || cityTax;
```

**After:**

```typescript
const cityTax = roomDetails.cityTax ||
  Math.round(price * CITY_TAX_RATE * 100) / 100;
const cityTaxForTwo = roomDetails.cityTaxForTwo ||
  Math.round(priceForTwo * CITY_TAX_RATE * 100) / 100;
```

**Import added:**

```typescript
import { CITY_TAX_RATE } from "@/lib/Constants";
```

---

### 6. Add fallback to SummaryCard

**File:** `app/[locale]/booking/[id]/components/SummaryCard.tsx`

**Before:**

```typescript
const calculateRoomTax = (adultsCount: number) => {
  if (adultsCount === 1) {
    return roomDetails?.cityTax || 0;
  }
  // ...
};
```

**After:**

```typescript
const calculateRoomTax = (adultsCount: number) => {
  const price = roomDetails?.price || 0;
  const priceForTwo = roomDetails?.priceForTwo || price;
  const cityTax = roomDetails?.cityTax ||
    Math.round(price * CITY_TAX_RATE * 100) / 100;
  const cityTaxForTwo = roomDetails?.cityTaxForTwo ||
    Math.round(priceForTwo * CITY_TAX_RATE * 100) / 100;

  if (adultsCount === 1) {
    return cityTax;
  }
  // ...
};
```

**Import added:**

```typescript
import { CITY_TAX_RATE } from "@/lib/Constants";
```

---

## Logic

**Primary source:** Apaleo API (`room.cityTaxes[0].totalGrossAmount.amount`)

**Fallback (if Apaleo doesn't provide):**
`Math.round(roomPrice * 0.075 * 100) / 100`

**Result:** City tax is always calculated, never `0` (unless room price is `0`)

---

## Testing

To verify:

1. Check rooms where Apaleo provides city tax → should use Apaleo value
2. Check rooms where Apaleo doesn't provide city tax → should calculate 7.5% of
   room price
3. Verify all booking prices include correct city tax amount
