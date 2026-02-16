# Booking Page Fixes #3-4

## Problem 3: mainRoom optional chaining

**File:** `app/[locale]/booking/[id]/components/BookingPage.tsx`

### Changes:

- ✅ Added `room.ratePlan?.code` check (line 40)
- ✅ Removed unnecessary `mainRoom?.` after early return (lines 54, 64, 70,
  79, 83)
- ✅ Changed `rooms[0]` to `mainRoom` in ExtrasSection (line 91)
- ✅ Added `|| 0` to parseInt (line 92)

---

## Problem 4: BookingMenu undefined checks

**File:** `app/[locale]/booking/[id]/components/BookingMenu.tsx`

### Before:

```typescript
const roomDetails = useBookingStore((state) => state.roomDetails) ||
  roomsOffers[0];
// No checks, crashes if undefined
```

### After:

```typescript
const roomDetails = useBookingStore((state) => state.roomDetails) ||
  roomsOffers[0];

if (!roomDetails || !rooms || rooms.length === 0) {
  return <div className="p-5 text-center">Loading room details...</div>;
}

// Safe defaults
const maxPersons = roomDetails.maxPersons || 2;
const price = roomDetails.price || 0;
const priceForTwo = roomDetails.priceForTwo || price;
const cityTax = roomDetails.cityTax || 0;
const cityTaxForTwo = roomDetails.cityTaxForTwo || cityTax;
const oneNightPrice = roomDetails.oneNightPrice || 0;
const oneNightPriceForTwo = roomDetails.oneNightPriceForTwo || oneNightPrice;
```

### Changes:

- ✅ Early return if roomDetails/rooms undefined
- ✅ Safe defaults for all price fields
- ✅ Simplified price calculations using defaults
