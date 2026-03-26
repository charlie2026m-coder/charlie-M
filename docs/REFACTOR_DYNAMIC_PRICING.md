# Dynamic Pricing Refactor — Implementation Guide

> Describes all architectural changes made to separate static room data from dynamic pricing,
> move availability fetching to the client, and enable reactive price updates without page reloads.

---

## Goals

1. **Static room content** (photos, title, description, attributes) — fetched once from Supabase, cached with `unstable_cache`, revalidated on admin changes.
2. **Dynamic prices** — fetched client-side via TanStack Query, reactive to date/guest changes.
3. **No full-page reloads** when the user changes dates in a booking form.
4. **Cache invalidation** — whenever an admin updates room data, all relevant pages revalidate automatically.

---

## Folder Structure Changes

```
services/
  supabase/
    getRoomsDetails.ts     ← moved from services/getRoomsDetails.ts
    getRoomDetails.ts      ← NEW: single room by ID, cached
  apaleo/
    getRooms.ts            ← moved from services/getAvailableRooms.ts
    getPrices.ts           ← NEW: min prices for home page carousel
    getRoomPrice.ts        ← NEW: server action for single room booking form

actions/
  revalidateRooms.ts       ← NEW: revalidates 'rooms' cache tag

app/[locale]/rooms/[id]/
  components/
    BookingForm.tsx        ← updated: uses TanStack Query, no more router.push reload
    NoCapacityWarning.tsx  ← DELETED: logic moved inline into BookingForm
```

---

## 1. Supabase Services

### `services/supabase/getRoomsDetails.ts`

Fetches all rooms from Supabase. Cached with `unstable_cache`.

**Key detail:** Uses `createClient` from `@supabase/supabase-js` directly — NOT the cookie-based server client. This is required because `unstable_cache` is incompatible with `cookies()`.

```ts
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

const fetchRoomsDetails = async (): Promise<RoomDetails[]> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase.from('rooms').select('*').order('id', { ascending: true });
  return data || [];
};

export const getRoomsDetails = unstable_cache(fetchRoomsDetails, ['supabase-rooms'], { tags: ['rooms'] });
```

### `services/supabase/getRoomDetails.ts`

Same pattern but for a single room by ID. Used in `generateStaticParams`, `generateMetadata`, and `RoomPage`.

```ts
export const getRoomDetails = unstable_cache(fetchRoomDetails, ['supabase-room'], { tags: ['rooms'] });
```

**Both functions share the `rooms` cache tag** — invalidated together when admin updates anything.

---

## 2. Cache Invalidation

### `actions/revalidateRooms.ts`

```ts
'use server';
import { revalidateTag } from 'next/cache';

export async function revalidateRooms() {
  revalidateTag('rooms');
}
```

Called in all admin mutation hooks after success:
- `app/hooks/useUpdateRoom.ts` — `onSuccess`
- `app/hooks/useRoomPhotos.ts` — `useUploadPhoto`, `useUploadMultiplePhotos`, `useDeletePhoto`

This ensures any Supabase change in the admin panel instantly revalidates the cached pages.

---

## 3. Apaleo Services

### `services/apaleo/getRooms.ts`

Moved from `services/getAvailableRooms.ts`. Export renamed from `getAvailableRooms` to `getRooms`. Used on the **rooms listing page** (`/rooms`).

Fetches all available rooms for given dates, merges Supabase static data, returns `RoomOffer[]`.
Wrapped with React `cache()` for per-request deduplication.

### `services/apaleo/getPrices.ts`

Server Action (`'use server'`). Used on the **home page** carousel via TanStack Query.

- Fetches Apaleo offers for the selected dates
- Selects the correct rate plan by nights count (`getRatePlanByNights`)
- Falls back to `FLEX_WEB` if the target rate plan has no results
- Returns only the minimum night price per room: `{ roomId, minNightPrice }[]`

```ts
export type RoomPrice = { roomId: string; minNightPrice: number };

export async function getPrices(from?: string, to?: string, guests: number = 1): Promise<RoomPrice[]>
```

### `services/apaleo/getRoomPrice.ts`

Server Action (`'use server'`). Used exclusively in **BookingForm** on the single room page.

- Fetches Apaleo offers for the specific room (adults=1 and adults=2 in parallel)
- Fetches baby bed availability in parallel
- Returns lean pricing data — only what BookingForm needs

```ts
export type RoomPriceOffer = {
  ratePlan: { id: string; code: string; name: string };
  availableUnits: number;
  maxPersons: number;
  averagePrice: number;
  averagePriceForTwo: number;
  totalGrossAmount: { amount: number; currency: string };
};

export type RoomPriceResult = {
  rooms: RoomPriceOffer[];
  babyBedAvailability: { isAvailable: boolean; count: number };
};

export async function getRoomPrice(
  roomId: string,
  from: string | undefined,
  to: string | undefined,
  maxPersons: number = 2,
): Promise<RoomPriceResult>
```

**Does NOT call `getRoomsDetails()`** — room static data is already available from the server component.

---

## 4. Single Room Page (`app/[locale]/rooms/[id]/page.tsx`)

### Before

- Server fetched `getSingleRoom` (Apaleo) + `getServiceAvailabilityById` (baby bed) on every request
- Derived `filteredRooms`, `room`, `hasEnoughCapacity` on the server
- Passed `rooms`, `babyBedAvailability`, `isUnavailable` as props to `BookingForm`
- When dates changed in `BookingForm` → `router.push('/rooms/${id}?new_dates')` → full page reload

### After

- Server fetches **only** `getRoomDetails(id)` (Supabase, cached)
- No Apaleo calls on the server
- `BookingForm` handles all availability internally via TanStack Query
- `Availability` and `RoomContent` always rendered (no conditional logic based on availability)

### `generateStaticParams`

Added to pre-generate all room pages at build time:

```ts
export async function generateStaticParams() {
  const { getRoomsDetails } = await import('@/services/supabase/getRoomsDetails');
  const rooms = await getRoomsDetails();
  return rooms.map((room) => ({ id: room.id }));
}
```

### `generateMetadata`

Now uses `getRoomDetails(id)` (Supabase, cached) instead of Apaleo for OG images and metadata.
Uses `roomDetail.photos[0]` for the OG image.

### Simplified `RoomPage` render

```tsx
const RoomPage = async ({ params, searchParams }) => {
  const roomDetail = await getRoomDetails(id); // only this — no Apaleo

  return (
    <div>
      <PhotoGallery images={roomDetail.photos} roomName={roomContent.name} />
      <div className="grid ...">
        <div className="col-span-2 xl:col-span-3">
          <RoomContent room={roomContent} isRoomInfo={true} />
          <Availability id={id} from={from} to={to} children={children} adults={adults} />
        </div>
        <div className="col-span-1">
          <BookingForm
            id={id}
            params={{ from, to, adults, children }}
            isKidsBedAvailable={isKidsBedAvailable}
            maxPersons={roomDetail.max_persons}
          />
        </div>
      </div>
    </div>
  );
};
```

---

## 5. BookingForm (`app/[locale]/rooms/[id]/components/BookingForm.tsx`)

### Props — Before vs After

| Before | After |
|--------|-------|
| `rooms: RoomOffer[]` | removed |
| `babyBedAvailability` | removed |
| `isUnavailable: boolean` | removed |
| `id, params, isKidsBedAvailable, maxPersons` | unchanged |

### TanStack Query integration

```ts
const { data, isLoading: isPriceLoading } = useQuery({
  queryKey: ['room-price', id, fromStr, toStr, guests.adults],
  queryFn: () => getRoomPrice(id, fromStr, toStr, maxPersonsProp),
  enabled: !!fromStr && !!toStr,
  staleTime: 1000 * 60 * 5,
});
```

- `fromStr` / `toStr` derived from local `dateRange` state (formatted with `getDate()`)
- When user picks new dates → state updates → query key changes → auto-refetch
- No more `datesChanged && router.push('/rooms/...')` pattern

### Derived values from query data

```ts
const room = data?.rooms.find(r => r.ratePlan.code.includes(type)) ?? data?.rooms[0] ?? null;
const babyBedAvailability = data?.babyBedAvailability;
const isUnavailable = !isPriceLoading && !!data && !room;
const hasEnoughCapacity = room ? guests.adults <= room.availableUnits * room.maxPersons : true;
```

### No-jump UI pattern

The price block always renders with fixed structure. Visibility changes via opacity and placeholder text — never via conditional mount/unmount:

```tsx
{/* Total row — always visible, transparent when unavailable */}
<div className={`flex justify-between mb-1 gap-2 ${isUnavailable || !hasEnoughCapacity ? 'opacity-0' : ''}`}>
  <div className='text-green font-medium'>{t('total')}</div>
  <div className={`... ${isPriceLoading ? 'text-gray-300' : 'text-green'}`}>
    {isPriceLoading ? '€ 00.00' : `€${currentPrice.toFixed(2)}`}
  </div>
</div>

{/* Info row — h-6 (24px) fixed height for all states */}
<div className='flex items-center gap-1 my-4 mb-6'>
  {isUnavailable || !hasEnoughCapacity ? (
    <span className='text-sm text-gray-400 h-6 flex items-center'>
      {/* warning text */}
    </span>
  ) : (
    <>
      <BsFillPersonFill />
      <span>{isPriceLoading ? '1 guest, 1 night, 1 room' : priceText}</span>
    </>
  )}
</div>
```

---

## 6. Rate Plans Constants (`lib/Constants.ts`)

Keys renamed to match actual Apaleo rate plan codes:

```ts
// Before
STANDARD, LONG_STAY2, LONG_STAY3, NON_REF, NON_REF_LONG_STAY2, NON_REF_LONG_STAY3

// After
FLEX_WEB, FLEX_WEB2, FLEX_WEB3, NR_WEB, NR_WEB2, NR_WEB3
```

`getRatePlanByNights()` and `getNonRefundableRatePlanByNights()` updated accordingly.
All usages in `utils.ts` and `getRooms.ts` updated.

---

## 7. Home Page — Hybrid SSR + Client Pricing

### Architecture

| Data | Where | How |
|------|-------|-----|
| Room cards (photos, names, attributes) | Server Component `RoomsSection` | `getRoomsDetails()` — Supabase, cached |
| Prices | Client Component `RoomsCarousel` | `useQuery` → `getPrices()` server action |

### `RoomsCarousel` query

```ts
const { data: prices, isLoading: isPriceLoading } = useQuery({
  queryKey: ['home-room-prices', from, to, guests.adults],
  queryFn: () => getPrices(from, to, guests.adults),
  staleTime: 1000 * 60 * 5,
});
```

- `from`, `to`, `guests` come from Zustand store (`useStore`)
- Reactive to CheckInForm date/guest changes without page reload
- Rooms sorted: available (with price) first, unavailable last

---

## 8. QueryClient Setup (`app/providers.tsx`)

Standard Next.js App Router + Suspense compatible pattern:

```ts
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function ReactQueryProvider({ children }) {
  const queryClient = getQueryClient(); // NOT useState — breaks with Suspense
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**Why not `useState`:** React discards client state on Suspense boundary suspend. Using a module-level singleton avoids "No QueryClient set" errors.

---

## Key Gotchas

| Issue | Solution |
|-------|----------|
| `unstable_cache` + `cookies()` incompatible | Use `createClient` directly, not cookie-based Supabase client |
| `revalidateTag` requires profile arg in some Next.js versions | `revalidateTag('rooms')` — check your Next.js version |
| Rate plan filter too strict → all rooms show as unavailable | Always fall back to `FLEX_WEB` if target rate plan returns no results |
| Form height jumps when price loads | Use `opacity-0` + fixed-height placeholder text instead of conditional render |
| TanStack Query "No QueryClient" with Suspense | Use module-level singleton `getQueryClient()`, never `useState` |
