# Booking Page Fixes #5-7

## Problem 5: getSingleRoom undefined checks

**File:** `services/getSingleRoom.ts`

### Changes:

- ✅ Optional chaining: `room.unitGroup?.id`, `room.ratePlan?.id`
- ✅ Safe defaults: `id || ''`, `name || 'Unknown Room'`
- ✅ Changed `maxPersons` default: `1` → `2`
- ✅ All price fields: `room.totalGrossAmount?.amount || 0`

---

## Problem 6: sortGuestsByRooms NaN validation

**File:** `lib/utils.ts` (lines 89-142)

### Before:

```typescript
export function sortGuestsByRooms(
  adults: number,
  children: number,
  from: string,
  to: string,
  maxPersons: number
): Room[] {
  const rooms: Room[] = [];
  let remainingAdults = adults;
  let remainingChildren = children;
```

### After:

```typescript
export function sortGuestsByRooms(...) {
  const validAdults = Number.isNaN(adults) ? 1 : Math.max(1, adults)
  const validChildren = Number.isNaN(children) ? 0 : Math.max(0, children)
  const validMaxPersons = Number.isNaN(maxPersons) || maxPersons < 1 ? 2 : maxPersons
  
  const rooms: Room[] = [];
  let remainingAdults = validAdults;
  let remainingChildren = validChildren;
```

### Changes:

- ✅ NaN validation for all numeric params
- ✅ All references updated to use `validAdults`, `validChildren`,
  `validMaxPersons`

---

## Problem 7: formatReservations undefined checks

**File:** `lib/utils.ts` (line 252)

### Before:

```typescript
export const formatReservations = (...) => {
  const timeSlices = roomDetails.timeSlices.map(...)
  const calculateRoomPrice = (adultsCount: number) => {
    const maxPersons = roomDetails.maxPersons || 2;
    return roomDetails.price || 0;
```

### After:

```typescript
export const formatReservations = (...) => {
  if (!roomDetails || !roomDetails.timeSlices || !roomDetails.ratePlan) {
    console.error('Invalid roomDetails:', roomDetails)
    return []
  }

  const timeSlices = roomDetails.timeSlices.map(...)
  
  // Safe defaults
  const maxPersons = roomDetails.maxPersons || 2
  const price = roomDetails.price || 0
  const priceForTwo = roomDetails.priceForTwo || price
  const cityTax = roomDetails.cityTax || 0
  const cityTaxForTwo = roomDetails.cityTaxForTwo || cityTax
```

### Changes:

- ✅ Early return if roomDetails invalid
- ✅ Safe defaults extracted
- ✅ Simplified calculations
