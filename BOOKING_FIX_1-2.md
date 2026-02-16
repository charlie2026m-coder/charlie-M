# Booking Page Fixes #1-2

## Problem 1: Empty rooms array crash

**File:** `app/[locale]/booking/[id]/page.tsx` **Lines:** 36, 39

### Before:

```typescript
const isKidsBedAvailable = rooms[0].attributes.includes("kids");
const filledRooms = sortGuestsByRooms(
  Number(adults),
  Number(children),
  from,
  to,
  rooms[0].maxPersons,
);
```

### After:

```typescript
if (!rooms || rooms.length === 0) {
  return <ErrorCard isSingleRoom={true} link="/rooms" />;
}
const isKidsBedAvailable = rooms[0].attributes?.includes("kids") || false;
const filledRooms = sortGuestsByRooms(
  Number(adults) || 1,
  Number(children) || 0,
  from,
  to,
  rooms[0]?.maxPersons || 2,
);
```

### Changes:

- ✅ Check empty array
- ✅ Optional chaining `attributes?.includes`
- ✅ Default values for NaN cases

---

## Problem 2: undefined mainRoom crash

**File:** `app/[locale]/booking/[id]/components/BookingPage.tsx` **Line:** 40

### Before:

```typescript
const mainRoom = rooms.find((room) => room.ratePlan.code === planType) ||
  rooms[0];
// No check, crashes on mainRoom.id access
```

### After:

```typescript
const mainRoom = rooms.find((room) => room.ratePlan.code === planType) ||
  rooms[0];

if (!mainRoom) {
  return <div className="p-10 text-center">Room data not available</div>;
}
```

### Changes:

- ✅ Early return if mainRoom undefined
- ✅ Prevents crashes in useEffect dependencies (lines 50, 60, 66)
- ✅ Prevents crashes in JSX (lines 79, 82, 87)
