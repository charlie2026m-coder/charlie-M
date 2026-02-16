# Booking Page Fix #8: No Rooms vs Error

## Problem
When no rooms available, returned `{ error: 'No rooms available' }` → showed error in console and ErrorCard.

## Solution
Distinguish **normal case** (no availability) from **technical error** (API crash).

### Changes:

**1. `services/getSingleRoom.ts`**
```typescript
// Before
if (!singleRoomResponse || singleRoomResponse.length === 0) {
  return { error: 'No rooms available for selected dates' };
}

// After
if (!singleRoomResponse || singleRoomResponse.length === 0) {
  return []; // Empty array = no availability (not error)
}
```

**2. `app/[locale]/booking/[id]/page.tsx`**
```typescript
if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
if (!rooms || rooms.length === 0) return <ErrorCard isSingleRoom={true} link='/rooms' message='No rooms available for selected dates' />
```

**3. `app/[locale]/rooms/components/ErrorCard.tsx`**
```typescript
// Added optional message prop
message?: string

<h2>
  {message || (isSingleRoom ? t('errors.roomLoadError') : t('errors.roomsLoadError'))}
</h2>
```

### Result:
- ✅ Empty array = no rooms (custom message, no console error)
- ✅ Error object = technical error (default error message)
