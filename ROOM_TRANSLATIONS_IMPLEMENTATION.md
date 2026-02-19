# Room Translations Implementation

This document describes the implementation of room translations for the Charlie
M Hotel application.

## Overview

Room translations allow the application to display room names and descriptions
in multiple languages (English and German) based on the user's locale selection.

## Changes Made

### 1. Created Room Translations File

**File:** `content/RoomTranslations.ts`

**Interface Definition:**

```typescript
export interface RoomTranslation {
  title: {
    en: string;
    de: string;
  };
  description: {
    en: string;
    de: string;
  };
}
```

**Room ID Constants:**

```typescript
export const ROOM_IDS = {
  SINGLE_BALCONY: "CMH-SGB",
  STANDARD_KING_BALCONY: "CMH-STKB",
  STANDARD_KING_SHARED_TERRACE: "CMH-STKST",
  BUSINESS_QUEEN: "CMH-BUQ",
  BUSINESS_QUEEN_BALCONY: "CMH-BUQB",
  BUSINESS_KING: "CMH-BUK",
  BUSINESS_KING_TERRACE: "CMH-BUKT",
  SUPERIOR_KING: "CMH-SPK",
  SUPERIOR_KING_GARDEN_WING: "CMH-SPKGW",
  SUPERIOR_KING_BALCONY: "CMH-SPKB",
  SUPERIOR_KING_SHARED_TERRACE: "CMH-SPKST",
  SUPERIOR_KING_TERRACE: "CMH-SPKT",
} as const;

export type RoomId = typeof ROOM_IDS[keyof typeof ROOM_IDS];
```

**Translation Object Example:**

```typescript
export const roomTranslations: Record<RoomId, RoomTranslation> = {
  [ROOM_IDS.SINGLE_BALCONY]: {
    title: {
      en: "Single Room with Balcony",
      de: "Einzelzimmer mit Balkon",
    },
    description: {
      en: "Designed for one guest, the Single Room with Balcony offers...",
      de: "Das Einzelzimmer mit Balkon ist für eine Person konzipiert...",
    },
  },
  // ... all 12 room types
};
```

**Room IDs included:**

- `CMH-SGB` - Single Room with Balcony
- `CMH-STKB` - Standard Room with King Size Bed and Balcony
- `CMH-STKST` - Standard Room with King Size Bed and Shared Terrace
- `CMH-BUQ` - Business Room with Queen Size Bed
- `CMH-BUQB` - Business Room with Queen Size Bed and Balcony
- `CMH-BUK` - Business Room with King Size Bed
- `CMH-BUKT` - Business Room with King Size Bed and Terrace
- `CMH-SPK` - Superior Room with King Size Bed
- `CMH-SPKGW` - Superior Room with King Size Bed - Garden Wing
- `CMH-SPKB` - Superior Room with King Size Bed and Balcony
- `CMH-SPKST` - Superior Room with King Size Bed and Shared Terrace
- `CMH-SPKT` - Superior Room with King Size Bed and Terrace

### 2. Updated `getAvailableRooms` Service

**File:** `services/getAvailableRooms.tsx`

**Import Added:**

```typescript
import { roomTranslations } from "@/content/RoomTranslations";
```

**Function Signature Updated:**

```typescript
// Before:
const getAvailableRoomsInternal = async (
  from?: string, 
  to?: string, 
  guests: number = 1
): Promise<GetAvailableRoomsResult>

// After:
const getAvailableRoomsInternal = async (
  from?: string, 
  to?: string, 
  guests: number = 1, 
  locale: string = 'en'
): Promise<GetAvailableRoomsResult>
```

**Translation Logic in Room Formatting:**

```typescript
const formattedRooms = singleRoomResponse.map((room) => {
  const roomDetails = roomsData.find((item) => item.id === room.unitGroup?.id);
  const doubleRoom = doubleRoomResponse?.find(
    (dr) =>
      dr.unitGroup?.id === room.unitGroup?.id &&
      dr.ratePlan?.id === room.ratePlan?.id,
  );

  const roomPrice = room.totalGrossAmount?.amount || 0;
  const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

  // Get translations for room
  const roomId = room.unitGroup?.id;
  const translation = roomId
    ? roomTranslations[roomId as keyof typeof roomTranslations]
    : null;
  const lang = locale === "de" ? "de" : "en";

  const translatedName = translation?.title[lang] || room.unitGroup?.name ||
    "Unknown Room";
  const translatedDescription = translation?.description[lang] ||
    room.unitGroup?.description || "";

  return {
    ...room,
    images: roomDetails?.photos || [],
    id: `${room.unitGroup?.id || ""}-${room.ratePlan?.id || ""}`,
    name: translatedName, // ← Uses translation
    description: translatedDescription, // ← Uses translation
    price: roomPrice,
    // ... rest of the fields
  };
});
```

**Usage:**

```typescript
const rooms = await getAvailableRooms(from, to, guests, locale);
```

### 3. Updated `getSingleRoom` Service

**File:** `services/getSingleRoom.ts`

**Import Added:**

```typescript
import { roomTranslations } from "@/content/RoomTranslations";
```

**Function Signature Updated:**

```typescript
// Before:
const getSingleRoomInternal = async (
  roomId: string, 
  from?: string, 
  to?: string, 
  adults?: string
): Promise<GetSingleRoomResult>

// After:
const getSingleRoomInternal = async (
  roomId: string, 
  from?: string, 
  to?: string, 
  adults?: string, 
  locale: string = 'en'
): Promise<GetSingleRoomResult>
```

**Promise.allSettled Implementation:**

```typescript
// Before: Sequential execution
const roomsData = await getRoomsDetails();
const singleRoomResponse = await Fetch<OfferResponse>(...);
const doubleRoomResponse = await Fetch<OfferResponse>(...).catch(() => undefined);

// After: Parallel execution with Promise.allSettled
const [roomsDataResult, singleRoomResult, doubleRoomResult] = await Promise.allSettled([
  getRoomsDetails(),
  Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=1`),
  Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=2`)
]);

// Handle roomsData
let roomsData: Awaited<ReturnType<typeof getRoomsDetails>> = [];
if (roomsDataResult.status === 'fulfilled') {
  roomsData = roomsDataResult.value;
} else {
  console.warn('Failed to fetch rooms details:', roomsDataResult.reason);
}

// Handle single room response
let singleRoomResponse: OfferResponse['offers'] = [];
if (singleRoomResult.status === 'fulfilled') {
  singleRoomResponse = singleRoomResult.value.offers || [];
} else {
  console.warn('Failed to fetch single room data:', singleRoomResult.reason);
}

// Handle double room response
let doubleRoomResponse: OfferResponse['offers'] | undefined;
if (doubleRoomResult.status === 'fulfilled') {
  doubleRoomResponse = doubleRoomResult.value.offers;
} else {
  console.warn('Failed to fetch double room data:', doubleRoomResult.reason);
}
```

**Translation Logic in Room Formatting:**

```typescript
const formattedRooms = singleRoomResponse.map((room) => {
  const roomDetails = roomsData.find((item) => item.id === room.unitGroup?.id);
  const doubleRoom = doubleRoomResponse?.find(
    (dr) =>
      dr.unitGroup?.id === room.unitGroup?.id &&
      dr.ratePlan?.id === room.ratePlan?.id,
  );

  const roomPrice = room.totalGrossAmount?.amount || 0;
  const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

  // Get translations for room
  const roomIdForTranslation = room.unitGroup?.id;
  const translation = roomIdForTranslation
    ? roomTranslations[roomIdForTranslation as keyof typeof roomTranslations]
    : null;
  const lang = locale === "de" ? "de" : "en";

  const translatedName = translation?.title[lang] || room.unitGroup?.name ||
    "Unknown Room";
  const translatedDescription = translation?.description[lang] ||
    room.unitGroup?.description || "";

  return {
    ...room,
    id: room.unitGroup?.id || "",
    name: translatedName, // ← Uses translation
    description: translatedDescription, // ← Uses translation
    // ... rest of the fields
  };
});
```

**Usage:**

```typescript
const rooms = await getSingleRoom(roomId, from, to, adults, locale);
```

### 4. Updated Function Calls

#### 4.1. `app/[locale]/rooms/page.tsx`

**Before:**

```typescript
const RoomsPage = async ({ searchParams }: Props) => {
  const { from, to, adults, children } = await searchParams;

  const rooms = await getAvailableRooms(from, to, adultsCount);
};
```

**After:**

```typescript
const RoomsPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params; // ← Extract locale
  const { from, to, adults, children } = await searchParams;

  const rooms = await getAvailableRooms(from, to, adultsCount, locale); // ← Pass locale
};
```

#### 4.2. `app/[locale]/home/RoomsSection.tsx`

**Before:**

```typescript
const RoomsSection = async ({ locale }: { locale: string }) => {
  const rooms = await getAvailableRooms();
};
```

**After:**

```typescript
const RoomsSection = async ({ locale }: { locale: string }) => {
  const rooms = await getAvailableRooms(undefined, undefined, 1, locale); // ← Pass locale
};
```

#### 4.3. `app/[locale]/rooms/[id]/page.tsx`

**generateMetadata - Before:**

```typescript
const rooms = await getSingleRoom(id, from, to, adults);
```

**generateMetadata - After:**

```typescript
const { id, locale } = await params; // ← Extract locale
const rooms = await getSingleRoom(id, from, to, adults, locale); // ← Pass locale
```

**RoomPage - Before:**

```typescript
const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params;
  const rooms = await getSingleRoom(id, from, to, adults);
};
```

**RoomPage - After:**

```typescript
const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id, locale } = await params; // ← Extract locale
  const rooms = await getSingleRoom(id, from, to, adults, locale); // ← Pass locale
};
```

#### 4.4. `app/[locale]/booking/[id]/page.tsx`

**Interface - Before:**

```typescript
interface IParams {
  params: Promise<{ id: string }>;
  // ...
}
```

**Interface - After:**

```typescript
interface IParams {
  params: Promise<{ id: string; locale: string }>; // ← Added locale
  // ...
}
```

**Component - Before:**

```typescript
const Booking = async ({ params, searchParams }: IParams) => {
  const { id } = await params;
  const rooms = await getSingleRoom(id, from, to, adults);
};
```

**Component - After:**

```typescript
const Booking = async ({ params, searchParams }: IParams) => {
  const { id, locale } = await params; // ← Extract locale
  const rooms = await getSingleRoom(id, from, to, adults, locale); // ← Pass locale
};
```

#### 4.5. `app/api/rooms/extension/route.ts`

**Before:**

```typescript
const [room, babyBedAvailability] = await Promise.all([
  getSingleRoom(roomId, from, to, "1"),
  // ...
]);
```

**After:**

```typescript
// Note: API route doesn't have locale context, using 'en' as default
const [room, babyBedAvailability] = await Promise.all([
  getSingleRoom(roomId, from, to, "1", "en"), // ← Pass 'en' as default
  // ...
]);
```

## Translation Logic

The translation system works as follows:

1. **Lookup**: When formatting a room, the system looks up the translation using
   `room.unitGroup?.id` as the key
2. **Language Selection**: Based on the `locale` parameter:
   - `'de'` → German translations
   - Any other value → English translations (default)
3. **Fallback**: If no translation is found for a room ID, the system falls back
   to:
   - Original `room.unitGroup?.name` for title
   - Original `room.unitGroup?.description` for description

## Benefits

1. **Performance**: Using `Promise.allSettled` in `getSingleRoom` allows
   parallel execution of all requests, improving response time
2. **Resilience**: Independent error handling ensures that if one request fails,
   others can still succeed
3. **Type Safety**: Strict typing with `RoomId` union type ensures only valid
   room IDs are used
4. **Maintainability**: Centralized translations make it easy to update room
   descriptions
5. **Internationalization**: Seamless language switching based on user's locale

## Future Enhancements

- Add support for additional languages
- Implement translation management system
- Add validation to ensure all room IDs have translations
- Consider moving translations to a database for easier management
