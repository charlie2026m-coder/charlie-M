# Charlie M Hotel — Project Context

## Project Overview

**Charlie M Hotel** is a full-featured online booking platform for a 5-star boutique aparthotel in Berlin (125 rooms).

Core capabilities:
- Room search & online booking
- Adyen payment processing
- Apaleo PMS integration (inventory, bookings, invoices)
- Guestway integration (room PIN codes, pre-check-in)
- User accounts, reservations management
- Pre-check-in flow
- Admin panel (room & service management)
- Bilingual EN/DE support

**Production URL:** `https://www.charlie-m.de`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| UI Primitives | Radix UI |
| Forms | React Hook Form + Zod |
| Client State | Zustand 5 (localStorage persistence) |
| Server State | TanStack React Query 5 |
| i18n | next-intl (EN/DE) |
| Auth & DB | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Adyen (`@adyen/adyen-web`, `@adyen/api-library`) |
| PMS | Apaleo (REST API, OAuth2 Client Credentials) |
| Guest Access | Guestway (REST API) |
| Maps | Google Maps API |
| Dates | date-fns, dayjs |

---

## Project Structure

```
/
├── app/
│   ├── [locale]/              # Public routes (EN/DE)
│   │   ├── booking/           # Booking flow (room options, payment, success)
│   │   ├── rooms/             # Room listing & detail pages
│   │   ├── home/              # Landing page sections
│   │   ├── profile/           # User profile & reservations
│   │   ├── login/             # Auth pages
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── privacy-policy/
│   │   ├── terms-and-conditions/
│   │   └── imprint/
│   ├── admin/                 # Admin panel (rooms, services management)
│   │   ├── login/
│   │   ├── rooms/
│   │   └── services/
│   ├── api/                   # Backend API routes (Next.js serverless)
│   │   ├── payments/          # Adyen: payment-methods, make-payment, payment-details
│   │   ├── bookings/          # Apaleo: create booking, search
│   │   ├── reservations/      # Reservation CRUD, cancel, booker-address
│   │   ├── rooms/             # Room availability, extension check
│   │   ├── services/          # Add/remove services on reservation
│   │   ├── check-in/          # Guestway pre-check-in
│   │   ├── invoice/           # Apaleo invoice PDF
│   │   ├── account/           # Account deletion
│   │   └── apaleo.ts          # Apaleo OAuth token management (cached, auto-refresh)
│   ├── _components/           # Shared React components
│   │   ├── Auth/
│   │   ├── header/
│   │   ├── footer/
│   │   ├── ui/                # Radix UI wrappers + custom components
│   │   └── contexts/
│   ├── hooks/                 # Custom hooks (useAuth, useProfile, etc.)
│   ├── providers.tsx           # React Query + Auth providers
│   └── sitemap.ts
├── services/                  # Data fetching functions (called from components/API)
│   ├── authService.ts
│   ├── getAvailableRooms.tsx
│   ├── getSingleRoom.ts
│   ├── getExtras.ts
│   ├── getReservation.ts
│   ├── bookReservationServices.ts
│   ├── createFolioPayment.ts
│   ├── getReservationAccessesServer.ts
│   └── Request.ts             # HTTP utility functions
├── store/                     # Zustand stores
│   ├── useBookingStore.ts      # Main booking state (rooms, services, payment refs)
│   ├── useAddExtras.ts
│   ├── useProfile.ts
│   └── useStore.ts
├── lib/                       # Utilities & config
│   ├── supabase.ts             # Client-side Supabase instance
│   ├── supabase-server.ts      # Server-side Supabase instance
│   ├── auth-provider.tsx       # Auth context
│   ├── Constants.ts            # Hotel info, rate plans, tax rates
│   ├── utils.ts                # cn(), getPath(), getPriceData(), etc.
│   └── getExtraImage.ts
├── types/                     # TypeScript interfaces
│   ├── apaleo.ts               # Apaleo API types (rooms, offers, reservations)
│   ├── booking.ts
│   ├── types.ts                # Room, Guest, Extra types
│   ├── offers.ts
│   ├── ratePlans.ts
│   ├── room.ts
│   ├── auth.ts
│   └── schemas.ts              # Zod validation schemas
├── language/                  # i18n translation files
│   ├── en.json
│   └── de.json
├── content/                   # Static content & email templates
│   ├── RoomTranslations.ts
│   ├── RoomsDetails.ts
│   ├── ServiceTranslations.ts
│   └── email-templates/       # HTML templates (booking, password reset, arrival, etc.)
├── supabase/
│   └── migrations/            # SQL migrations (profiles, admins, rooms, bookings, GDPR, services)
├── public/
│   └── images/
├── middleware.ts               # i18n routing + auth protection
├── i18n.ts
├── navigation.ts
└── next.config.ts
```

---

## Running the Project

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm start
npm run lint
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Apaleo (PMS)
APALEO_CLIENT_ID=
APALEO_CLIENT_SECRET=
APALEO_PROPERTY_ID=CMH
APALEO_ACCOUNT_ID=RKAA

# Adyen (Payments)
ADYEN_API_KEY=
ADYEN_MERCHANT_ACCOUNT=
NEXT_PUBLIC_ADYEN_CLIENT_KEY=
NEXT_PUBLIC_ADYEN_ENVIRONMENT=test

# Guestway (PIN codes / pre-check-in)
GUESTWAY_API_URL=
GUESTWAY_API_KEY=
GUESTWAY_ACCESS_TOKEN=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# App
NEXT_PUBLIC_BASE_URL=https://www.charlie-m.de
```

---

## Database (Supabase PostgreSQL)

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (synced via trigger from `auth.users`) |
| `admins` | Admin users with roles (`admin`, `super_admin`) |
| `rooms` | Room catalog (`id` = Apaleo unit group, e.g. `CMH-SGB`) |
| `reservations` | User↔reservation linkage (ties Apaleo `reservation_id` to `user_id`) |
| `consents` | GDPR consent records per user |
| `service_translations` | Services/extras with name, description, price, image per locale |
| `room_translations` | Room titles & descriptions per locale |

### Storage Buckets
- `room-photos` — public room images
- `services` — public service images

### Key Triggers
- `handle_new_user()` — auto-creates profile row on signup
- `handle_user_updated()` — syncs email/name changes
- `handle_updated_at()` — auto-timestamps on update

### RLS
- Users access only their own profile/reservations
- Only admins can write to rooms/services/translations
- Storage writes restricted to admin role

---

## External Integrations

### Apaleo (PMS)
- **Auth:** OAuth2 Client Credentials, token cached in memory with 60s refresh buffer, auto-retry on 401
- **Key endpoints used:**
  - `GET /booking/v1/offers` — room availability
  - `POST /booking/v1/bookings` — create booking (with retry + exponential backoff)
  - `GET/PATCH /booking/v1/reservations` — read/update reservations
  - `PUT /booking/v1/reservation-actions/{id}/book-service` — add extras
  - `GET /finance/v1/folios/{id}` — folio for payment
  - `GET /finance/v0-nsfw/invoices/preview-pdf` — invoice PDF
- **Rate plans:** `FLEX_WEB`, `NR_WEB`, `FLEX_WEB7`, `NR_WEB7`
- **Property ID:** `CMH`, **Account ID:** `RKAA`

### Adyen (Payments)
- **Merchant Account:** `ApaleoGmbHCOM`
- **Environment:** `test` (switch to `live` for production)
- API routes: `/api/payments/payment-methods`, `/api/payments/make-payment`, `/api/payments/payment-details`
- Metadata attached to payment: `flowType`, `accountId`, `propertyId`

### Guestway (Guest Access)
- Provides PIN codes for room entry
- Handles pre-check-in confirmation
- Called at `/api/check-in`

---

## State Management

### Zustand — `useBookingStore` (persisted as `charlie-booking-storage`)
Key fields:
- `booking` — full booking object
- `rooms` — selected rooms with guest info and extras
- `roomDetails` — selected room offer from Apaleo
- `services` — selected services with dates
- `extras` — available extras list
- `isRefundable`, `isExtend` — booking flags
- `reservationId`, `apaleoBookingId` — reference IDs after booking
- `transactionReference` — Adyen payment reference

### React Query
- `staleTime: 60s`, `refetchOnWindowFocus: false`
- Used for: room availability, reservation data, payment methods, invoice

---

## Authentication

- **Supabase Auth** — email/password, Google OAuth, Apple OAuth, anonymous (guest checkout)
- **Password reset** — email link flow
- **Admin auth** — separate `/admin/login`, email checked against `admins` table
- **Protected routes** — `/profile/*` requires session (enforced in `middleware.ts`)
- **Locale-aware redirects** — redirect preserves locale prefix

---

## Internationalization

- Supported locales: `en` (default), `de`
- All routes prefixed: `/en/...`, `/de/...`
- Translations in `/language/en.json` and `/language/de.json`
- Room and service descriptions also stored localized in Supabase (`room_translations`, `service_translations`)
- No browser auto-detection — URL-based only

---

## SEO

- `generateMetadata()` per page
- JSON-LD Hotel structured data in root layout
- Sitemap at `/sitemap.ts`
- `robots.txt` in `/public`
- `hreflang` alternate links for EN/DE
- `metadataBase` set to production URL

---

## Git & Release Conventions

- **Branches:** `dev` → `main` (PR only)
- **Commit format:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- **Releases:** semantic-release automation on merge to `main`
- **Versioning:** semver (major.minor.patch)

---

## Hotel Info (from `lib/Constants.ts`)

| Field | Value |
|-------|-------|
| Name | Charlie M Hotel |
| Address | Friedrichstraße 33, Berlin 10969, Germany |
| Phone | +5 077 6764 8570 |
| Email | info@charlie-m.de |
| Stars | 5 |
| Rooms | 125 |
| Check-in | 15:00–00:00 |
| Check-out | 11:00 |

---

## Key File Quick Reference

| Need to… | Go to |
|----------|-------|
| Auth logic | `services/authService.ts`, `lib/auth-provider.tsx` |
| Booking state | `store/useBookingStore.ts` |
| Payment flow | `app/api/payments/`, `app/[locale]/booking/[id]/payment/` |
| Apaleo token/auth | `app/api/apaleo.ts` |
| Apaleo data fetch | `services/getAvailableRooms.tsx`, `services/getReservation.ts` |
| Guestway / PIN codes | `app/api/check-in/route.ts`, `services/getReservationAccessesServer.ts` |
| DB schema | `supabase/migrations/` |
| TypeScript types | `types/*.ts` |
| Zod schemas | `types/schemas.ts` |
| Translations | `language/en.json`, `language/de.json` |
| Shared components | `app/_components/` |
| Custom hooks | `app/hooks/` |
| Hotel constants | `lib/Constants.ts` |
| Routing helpers | `navigation.ts`, `lib/utils.ts` (getPath) |
