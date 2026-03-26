# BookingMenu — Price Calculation Logic

This document describes exactly how prices are calculated and displayed in
`app/[locale]/booking/[id]/components/BookingMenu.tsx`.

---

## Data Sources

```ts
const rooms       = useBookingStore(state => state.rooms)     // user's room list (from Zustand)
const roomDetails = useBookingStore(state => state.roomDetails) // RoomOffer selected for this booking

const maxPersons  = roomDetails.maxPersons   // max guests per physical room (usually 2)
const price       = roomDetails.price        // total stay price for 1 adult  (city tax INCLUDED)
const priceForTwo = roomDetails.priceForTwo  // total stay price for 2 adults (cityTaxForTwo INCLUDED)
```

`price` and `priceForTwo` come from `services/getSingleRoom.ts`:
```ts
price       = totalGrossAmount.amount + cityTaxes[0].totalGrossAmount.amount
priceForTwo = doubleRoom.totalGrossAmount.amount + doubleRoom.cityTaxes[0].totalGrossAmount.amount
```

Both values cover the **entire stay** (all nights combined). City tax is already inside — never add it again.

---

## Step 1 — Price per room entry

Each entry in `rooms[]` has an `adults` count. Price is calculated like this:

```ts
const calculateRoomPrice = (adultsCount: number) => {
  const roomsNeeded = Math.ceil(adultsCount / maxPersons);

  if (adultsCount === 1) {
    return price;                            // 1 room, single occupancy
  } else if (adultsCount % 2 === 0) {
    return roomsNeeded * priceForTwo;        // N double rooms
  } else {
    const doubleRooms = Math.floor(adultsCount / 2);
    return (doubleRooms * priceForTwo) + price; // M double rooms + 1 single room
  }
};
```

Examples (maxPersons = 2):
| adults | rooms needed | formula | note |
|---|---|---|---|
| 1 | 1 | `price` | single room |
| 2 | 1 | `1 × priceForTwo` | double room |
| 3 | 2 | `1 × priceForTwo + price` | 1 double + 1 single |
| 4 | 2 | `2 × priceForTwo` | 2 double rooms |
| 5 | 3 | `2 × priceForTwo + price` | 2 double + 1 single |

---

## Step 2 — Total rooms price

```ts
const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
```

Each room entry in the `rooms[]` array is processed independently.

---

## Step 3 — Extras price

Extras are recalculated on every render using `getExtraPrice`:

```ts
const updatedRooms = rooms.map(room => ({
  ...room,
  extras: room.extras?.map(extra => ({
    ...extra,
    totalPrice: getExtraPrice(extra, room.adults + room.children, nights, from, to),
  })),
}))

const extrasTotalPrice = updatedRooms.reduce((acc, room) =>
  acc + (room.extras?.reduce((sum, extra) => sum + (extra.totalPrice || 0), 0) || 0), 0
);
```

---

## Step 4 — Total price

```ts
const totalPrice = Math.round((roomsTotalPrice + extrasTotalPrice) * 100) / 100
```

This is what is displayed in the UI and also what gets passed to `formatReservations` for the payment payload.

---

## Step 5 — Taxes tooltip (display only)

```ts
const totalTaxes = roomDetails.taxes
  ? calculateTotalTaxes(rooms, roomDetails.taxes, maxPersons)
  : null
```

`calculateTotalTaxes` from `lib/utils.ts` mirrors `calculateRoomPrice` logic but for tax fields:

```ts
export const calculateTotalTaxes = (
  rooms: { adults: number }[],
  taxes: { vatTax: number; cityTax: number; cityTaxForTwo: number },
  maxPersons: number,
): { vatTax: number; cityTax: number } => {
  const { vatTax, cityTax, cityTaxForTwo } = taxes;

  // cityTax     = tax for 1 adult room (whole stay)
  // cityTaxForTwo = tax for 2 adult room (whole stay) — can differ from cityTax
  const totalCityTax = rooms.reduce((acc, room) => {
    const a = room.adults;
    if (a === 1) return acc + cityTax;
    if (a % 2 === 0) return acc + Math.ceil(a / maxPersons) * cityTaxForTwo;
    return acc + Math.floor(a / 2) * cityTaxForTwo + cityTax;
  }, 0);

  // count total physical rooms to scale vatTax
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

> This is **only for the tooltip** ("taxes included" info). It does not affect `totalPrice`.

---

## What is displayed in the UI

```
Room 1 (2 guests)  x 3 nights   € 243.00   ← calculateRoomPrice(2) for that room entry
Room 2 (1 guest)   x 3 nights   € 135.00   ← calculateRoomPrice(1) for that room entry
Taxes included ℹ️                           ← TaxesInfo with totalTaxes (tooltip: VAT + City Tax)

Extra: Cleaning (2 nights)       €  30.00   ← extra.totalPrice from getExtraPrice
Total extras:                    €  30.00

Total price:                     € 408.00   ← totalPrice = roomsTotalPrice + extrasTotalPrice
```

---

## What gets sent to Apaleo (payment payload)

`formatReservations` in `lib/utils.ts` — per reservation:

```ts
const roomPrice = calculateRoomPrice(item.adults)  // same logic as above
const extrasTotalPrice = item.extras?.reduce(...)
const reservationAmount = Math.round((roomPrice + extrasTotalPrice) * 100) / 100
// city tax is NOT added again — it's already inside roomPrice
```
