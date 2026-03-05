# Charlie M Hotel

Automated aparthotel booking platform in Berlin. Users browse rooms, book via Apaleo, pay with Adyen, and manage reservations. Includes guest pre-check-in (Guestway), profile with linked reservations, and admin panel for rooms and services.

## Tech Stack

### Framework
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**

### Styling
- **Tailwind CSS 4**
- **Radix UI** (accessible components)
- **class-variance-authority** (component variants)

### Data & State
- **TanStack Query** (server state)
- **Zustand** (client state)
- **Supabase** (database, auth, storage)

### Forms & Validation
- **React Hook Form**
- **Zod** (schema validation)
- **@hookform/resolvers**

### Internationalization
- **next-intl** (DE/EN)

### Integrations
- **Adyen** — payments (@adyen/adyen-web, @adyen/api-library)
- **Apaleo** — PMS booking API
- **Guestway** — guest access and pin codes
- **Google Maps API** — maps and directions

### UI Components
- **Embla Carousel**, **Swiper** (carousels)
- **cmdk** (command menu)
- **Vaul** (drawers)
- **Sonner** (toast notifications)

### Utilities
- **date-fns**, **dayjs** (date handling)
- **clsx**, **tailwind-merge** (classnames)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Apaleo API credentials
- Adyen API credentials
- Google Maps API key
- Guestway API credentials

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd CharlieM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in required API keys and credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Required variables in `.env`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Apaleo
APALEO_CLIENT_ID=
APALEO_CLIENT_SECRET=
APALEO_PROPERTY_ID=

# Adyen
ADYEN_API_KEY=
ADYEN_MERCHANT_ACCOUNT=
NEXT_PUBLIC_ADYEN_CLIENT_KEY=
NEXT_PUBLIC_ADYEN_ENVIRONMENT=

# Guestway
GUESTWAY_API_URL=
GUESTWAY_API_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# App
NEXT_PUBLIC_BASE_URL=
```

---

## SEO Optimization

- **Metadata** — `generateMetadata` per page with locale-specific title, description, openGraph
- **Sitemap** — `app/sitemap.ts` with public routes (home, rooms, legal, etc.)
- **Robots** — `public/robots.txt` with Sitemap URLs
- **Indexing** — `robots.index: true` for public pages; `false` for dynamic query pages (e.g., rooms with search params) and error states
- **Hreflang** — locale alternates in metadata for DE/EN
- **Canonical** — `metadataBase` in root layout for canonical URLs

---

## CI/CD

> **Recommendation**  
> - Name merge requests the same as the latest commit message in the branch being merged.
> - Only merges from `development` branch are allowed into `main` to automatically create a release.
> - When merging from `development` into `main`, **do not use squash commit**.

### Using semantic-release

semantic-release automates the package release workflow including: determining the next version number, generating the release notes, and publishing the package. This follows [Semantic Versioning Specification](http://semver.org/).

#### MAJOR.MINOR.PATCH version numbering

Increment the:
- **MAJOR** version when making incompatible API changes
- **MINOR** version when adding functionality in a backward compatible manner
- **PATCH** version when making backward compatible bug fixes

#### Rules for committing to development branch

| commit | release | next version | sample commit message |
|-----------|---------|--------------|-----------------------------------------------------|
| refactor: | patch | 1.0.0→1.0.1 | refactor: implement calculation method as recursion |
| fix: | patch | 1.0.0→1.0.1 | fix: add missing parameter to service call |
| docs: | patch | 1.0.0→1.0.1 | docs: update readme |
| style: | patch | 1.0.0→1.0.1 | style: update button styles |
| test: | patch | 1.0.0→1.0.1 | test: add unit tests |
| build: | major | 1.0.0→2.0.0 | build: update lock file |
| ci | patch | 1.0.0→1.0.1 | ci: add new stage (integration test) |
| revert | patch | 1.0.0→1.0.1 | revert: revert to commit abc123 |
| feat: | minor | 1.0.0→1.1.0 | feat(lang): add Polish language |
| chore: | minor | 1.0.0→1.1.0 | chore: drop support for Node 6 |
| perf: | minor | 1.0.0→1.1.0 | perf: improve rendering performance |

#### Conventional Commits

The Conventional Commits specification is a lightweight convention on top of commit messages. It provides an easy set of rules for creating an explicit commit history.

The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

The commit contains the following structural elements:

1. **fix:** a commit of the type fix patches a bug in your codebase (correlates with PATCH in Semantic Versioning)
2. **feat:** a commit of the type feat introduces a new feature to the codebase (correlates with MINOR in Semantic Versioning)
3. **BREAKING CHANGE:** a commit that has a footer BREAKING CHANGE:, or appends a ! after the type/scope, introduces a breaking API change (correlates with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type
4. Types other than fix: and feat: are allowed, for example @commitlint/config-conventional (based on the Angular convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others

Learn more: https://www.conventionalcommits.org/en/v1.0.0/

---

## Site Pages

### Public Pages

**/** (Home)
- GET Apaleo `/booking/v1/offers` - fetch available rooms
- POST `/api/check-in` - pre-check-in (Guestway)

**welcome**

**rooms**
- GET Apaleo `/booking/v1/offers` - fetch available rooms
- GET Apaleo `/availability/v1/services` - baby bed availability
- POST `/api/check-in` - pre-check-in

**rooms/[id]**
- GET Apaleo `/booking/v1/offers` - fetch room offers
- GET Apaleo `/availability/v1/services` - service availability

**booking/[id]**
- GET Apaleo `/booking/v1/offers` - fetch room offers

**booking/[id]/payment**
- POST `/api/payments/payment-methods` - get payment methods (Adyen)
- POST `/api/payments/make-payment` - create payment (Adyen)
- POST `/api/payments/payment-details` - submit payment (Adyen)
- POST `/api/bookings/create` - create booking (Apaleo)

**booking/[id]/success**

### Auth Pages

**login**
- GET `/api/reservations/search-booking` - search reservation (Apaleo)
- POST Supabase `auth.signInWithPassword` - email login
- POST Supabase `auth.signInWithOAuth` - Google/Apple login
- POST Supabase `auth.signInAnonymously` - guest mode

**signup**
- GET `/api/reservations/search-booking` - search reservation (Apaleo)
- POST Supabase `auth.signUp` - register
- POST Supabase `auth.signInWithOAuth` - Google/Apple login
- POST Supabase `auth.signInAnonymously` - guest mode

**forgot-password**
- POST Supabase `auth.resetPasswordForEmail` - send reset email

**reset-password**
- GET Supabase `auth.getSession` - get session
- PUT Supabase `auth.updateUser` - set new password

### Legal Pages

- **privacy-policy**
- **terms-and-conditions**
- **imprint**

### Profile Pages

**profile**
- GET Supabase `from(profiles)` - user profile
- PUT Supabase `auth.updateUser` - update profile
- POST `/api/account/delete` - delete account

**profile/reservations**
- GET `/api/reservations` - list reservations (Apaleo)
- GET Supabase `from(reservations)` - linked reservations
- GET `/api/reservations/[id]` - get reservation
- POST `/api/check-in` - pre-check-in
- GET `/api/invoice` - invoice PDF

**profile/reservations/[id]**
- GET Apaleo `/booking/v1/reservations/{id}` - get reservation
- GET Guestway `/reservation-accesses` - pin codes
- GET `/api/units/[id]` - unit floor (Apaleo inventory)
- GET `/api/rooms/extension` - extension availability (Apaleo offers)
- PATCH `/api/reservations/[id]/booker-address` - update booker address
- DELETE `/api/services` - remove service
- POST `/api/reservations/[id]/cancel` - cancel reservation
- POST `/api/check-in` - pre-check-in
- GET `/api/invoice` - invoice PDF

**profile/reservations/[id]/payment**
- POST `/api/payments/payment-methods` - get payment methods (Adyen)
- POST `/api/payments/make-payment` - create payment (Adyen)
- POST `/api/payments/payment-details` - submit payment (Adyen)
- POST `/api/services` - add services and pay
- POST `/api/bookings/create` - create booking (Apaleo)

### Admin Pages

**admin/login**
- GET Supabase `auth.getUser` - check session
- POST Supabase `auth.signInWithPassword` - login
- POST Supabase `auth.signInWithOAuth` - Google login
- GET Supabase `from(admins)` - check admin role

**admin/rooms**
- GET Supabase `auth.getUser` - check session
- GET Supabase `from(admins)` - check role
- GET Supabase `from(service_translations)` - services list

**admin/rooms/[id]**
- GET Supabase `auth.getUser` - check session
- GET Supabase `from(admins)` - check role
- GET Supabase `from(rooms)` - room data
- POST Supabase `storage.upload` - upload photo
- POST Supabase `from(rooms).update` - update room

**admin/services/[id]**
- GET Supabase `auth.getUser` - check session
- GET Supabase `from(admins)` - check role
- GET Supabase `from(service_translations)` - service data
- POST Supabase `storage.upload` - upload photo
- POST Supabase `from(service_translations).update` - update service

---

## API Integrations

### Apaleo API

**Bookings:**
- `POST /booking/v1/bookings` - create new booking

**Reservations:**
- `GET /booking/v1/reservations?textSearch=...&propertyIds=...&expand=services` - list reservations
- `GET /booking/v1/reservations/{id}?propertyIds=...&expand=booker,services` - get reservation with details
- `PATCH /booking/v1/bookings/{id}` - update booking (booker address)

**Reservation Actions:**
- `PUT /booking/v1/reservation-actions/{id}/book-service` - book service
- `PUT /booking/v1/reservation-actions/{id}/cancel` - cancel reservation

**Services:**
- `DELETE /booking/v1/reservations/{id}/services?serviceId=...` - remove service

**Offers:**
- `GET /booking/v1/offers?propertyId=...&arrival=...&departure=...&channelCode=Ibe&adults=...` - fetch available room offers

**Inventory:**
- `GET /inventory/v1/units/{id}` - get unit floor number

**Folios:**
- `GET /finance/v1/folios/{id}` - get folio for payment
- `PATCH /finance/v1/folios/{id}` - update folio debitor address
- `POST /finance/v1/folios/{id}/payments/by-authorization` - process payment

**Invoices:**
- `GET /finance/v0-nsfw/invoices/preview-pdf?folioId=...` - get invoice PDF

### Google APIs

**Maps:**
- Google Maps JavaScript API (`useJsApiLoader`, `GoogleMap`) - display map with marker
- `GET https://www.google.com/maps/search/?api=1&query=...` - link to Google Maps directions

**OAuth:**
- `signInWithOAuth(google)` - sign in with Google account

### Supabase

**Auth:**
- `auth.signInWithPassword` - sign in with email and password
- `auth.signUp` - register new user
- `auth.getSession` - get current session
- `auth.signOut` - sign out
- `auth.signInWithOAuth` - sign in with Google/Apple
- `auth.signInAnonymously` - guest mode without account
- `auth.resetPasswordForEmail` - send password reset email
- `auth.updateUser` - update password or profile
- `auth.exchangeCodeForSession` - OAuth redirect callback

**Database:**
- `from(rooms)` - room details and photos
- `from(profiles)` - user profile
- `from(reservations)` - user linked reservations
- `from(consents)` - consent records
- `from(admins)` - check admin role
- `from(service_translations)` - service names and images

**Storage:**
- `storage.from(room-photos).upload` - upload room photo
- `storage.from(room-photos).getPublicUrl` - get photo URL
- `storage.from(room-photos).remove` - delete room photo
- `storage.from(services).upload` - upload service photo
- `storage.from(services).remove` - delete service photo

### Guestway API

- `GET /reservation-accesses?filters=...` - get pin codes and room numbers
- `GET /reservations?filters=...` - get reservation for pre-check-in

### Adyen API

- `POST PaymentsApi.paymentMethods` - get payment methods
- `POST PaymentsApi.payments` - create payment
- `POST PaymentsApi.paymentsDetails` - submit payment details

---

## Project Structure

```
CharlieM/
├── app/                      # Next.js App Router
│   ├── [locale]/             # Internationalized routes
│   │   ├── home/             # Home page sections
│   │   ├── rooms/            # Room listing and details
│   │   ├── booking/          # Booking flow
│   │   ├── profile/          # User profile and reservations
│   │   ├── login/            # Authentication pages
│   │   └── ...
│   ├── admin/                # Admin panel
│   ├── api/                  # API routes
│   ├── auth/                 # Auth callbacks
│   └── _components/          # Shared components
├── content/                  # Static content (legal texts, etc.)
├── language/                 # Translation files (en.json, de.json)
├── lib/                      # Utilities and helpers
├── services/                 # API service functions
├── store/                    # Zustand state management
├── supabase/                 # Database migrations
├── types/                    # TypeScript types
└── public/                   # Static assets
```

---

## Contributing

1. Create a feature branch from `development`
2. Follow conventional commit format
3. Submit PR to `development` branch
4. After review and merge, changes will be released to `main`

---

## License

Private project. All rights reserved.
