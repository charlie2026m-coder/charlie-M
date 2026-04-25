# SEO & Analytics Documentation

## Part 1 — SEO Optimizations

### 1. Metadata

Every public page implements `generateMetadata()` with locale-aware titles and descriptions:

| Page | File |
|------|------|
| Home | `app/[locale]/page.tsx` |
| Rooms listing | `app/[locale]/(main)/rooms/page.tsx` |
| Room detail | `app/[locale]/(main)/rooms/[id]/page.tsx` |
| Privacy Policy | `app/[locale]/(main)/privacy-policy/page.tsx` |
| Terms & Conditions | `app/[locale]/(main)/terms-and-conditions/page.tsx` |
| Imprint | `app/[locale]/(main)/imprint/page.tsx` |
| Locale layout (hreflang) | `app/[locale]/layout.tsx` |

Root metadata defaults are set in `app/layout.tsx` and used as fallbacks.

**`metadataBase`** is set to the production URL so all relative OG image paths resolve correctly:
```ts
metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://charlie-m.de')
```

**Title template** in root layout applies `%s | Charlie M Hotel` to all child pages:
```ts
title: { default: 'Charlie M Hotel | ...', template: '%s | Charlie M Hotel' }
```

---

### 2. Canonical URLs & hreflang

Every page sets an explicit canonical URL and `alternates.languages` for EN/DE:

```ts
alternates: {
  canonical: isGerman ? `${siteUrl}/de/rooms` : `${siteUrl}/rooms`,
  languages: {
    en: `${siteUrl}/rooms`,
    de: `${siteUrl}/de/rooms`,
  }
}
```

The locale layout also injects hreflang at the layout level for all pages within it.

---

### 3. Open Graph & Twitter Cards

All key pages include full OG and Twitter Card metadata:

- `og:type` = `website`
- `og:locale` = `en_US` or `de_DE` based on active locale
- `og:image` = `1200x630` hotel photo (`/images/og-image.jpg`), replaced with the room's own photo on room detail pages
- Twitter card type: `summary_large_image`

Room detail pages use the room's first photo as the OG image, falling back to the default hotel image.

---

### 4. JSON-LD Structured Data

Hotel schema is injected in the root layout (`app/layout.tsx`) as a `<script type="application/ld+json">`:

```json
{
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": "Charlie M Hotel",
  "address": { ... },
  "telephone": "...",
  "url": "https://www.charlie-m.de",
  "priceRange": "...",
  "starRating": { "@type": "Rating", "ratingValue": "5" }
}
```

---

### 5. Robots Meta

- Public pages (`/`, `/rooms`, `/rooms/:id`, legal pages): `index: true, follow: true`
- Rooms listing and room detail pages with query params (`?from=...&to=...`): `index: false` to avoid indexing paginated/filtered search result URLs

```ts
robots: {
  index: !hasQueryParams,
  follow: !hasQueryParams,
  noarchive: hasQueryParams,
}
```

---

### 6. robots.txt

Located at `public/robots.txt`:

- Explicitly **allows** all public pages and room URLs for all bots
- **Disallows** private routes: `/profile`, `/booking`, `/login`, `/signup`, `/api`, `/admin`
- Sets `Crawl-delay: 1` for all bots
- Declares both sitemap URLs (with and without `www`)

---

### 7. Sitemap

`app/sitemap.ts` generates a dynamic `sitemap.xml` at build time using `MetadataRoute.Sitemap`:

| URL | Priority | Change Frequency |
|-----|----------|-----------------|
| `/` (EN + DE) | 1.0 | daily |
| `/rooms` (EN + DE) | 0.9 | daily |
| `/privacy-policy` (EN + DE) | 0.3 | yearly |
| `/terms-and-conditions` (EN + DE) | 0.3 | yearly |
| `/imprint` (EN + DE) | 0.3 | yearly |

Each URL includes `alternates.languages` with EN/DE variants.

> Room detail pages (`/rooms/:id`) are **not** in the sitemap — they are dynamically generated from Apaleo inventory and may not always be available.

---

### 8. Static Generation & Revalidation

- Room detail pages use `generateStaticParams()` to pre-render known rooms at build time
- Rooms listing uses `export const revalidate = 60` (1-minute ISR)
- Home page uses `export const revalidate = 300` (5-minute ISR)

---

### 9. Viewport & Mobile

Root layout sets strict viewport meta to prevent unwanted zoom on mobile:

```ts
viewport: {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}
```

---

### 10. Link Prefetching

The root layout prefetches the rooms page for faster navigation:

```html
<link rel="prefetch" href="/rooms" />
<link rel="prefetch" href="/de/rooms" />
```

---

### 11. Page Titles (Examples)

| Page | EN Title |
|------|----------|
| Home | Charlie M Hotel \| Hotel in Berlin Mitte near Checkpoint Charlie |
| Rooms | Rooms & Suites \| Charlie M Hotel Berlin Mitte |
| Room detail | {Room Name} \| Charlie M Hotel Berlin |
| Privacy Policy | Privacy Policy \| Charlie M Hotel Berlin |
| Imprint | Imprint \| Charlie M Hotel Berlin |

---

## Part 2 — Google Analytics 4 & Google Ads

### Overview

The analytics infrastructure implements:
- Google Analytics 4 (GA4) with SPA pageview tracking
- Google Ads conversion tracking
- GDPR Consent Mode v2 (required in Germany / EU)
- Granular cookie consent banner (analytics + ads toggles)

---

### Environment Variables

Add these to your `.env` file (currently empty — fill before going live):

```env
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=XXXXXXXXXXXX

# Apaleo property ID (client-accessible, used in purchase events)
NEXT_PUBLIC_APALEO_PROPERTY_ID=CMH
```

> `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_GOOGLE_ADS_ID` are mutually optional — if only one is set, only that tag loads. If both are set, a single gtag.js request loads both.

---

### Consent Mode v2

Implemented via a `beforeInteractive` script in `app/layout.tsx`. Consent defaults are set to **denied** before any gtag.js code runs:

```js
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
```

When the user interacts with the cookie banner, `applyConsent()` in `lib/analytics.ts` calls `gtag('consent', 'update', {...})` with the selected values and persists the choice to `localStorage` under key `charlie_cookie_consent`.

On return visits, stored consent is restored immediately on mount — no banner shown again.

---

### Cookie Consent Banner

Component: `app/_components/CookieConsent/CookieConsentBanner.tsx`

- Shown on first visit (no stored consent)
- Two granular toggles: **Analytics** and **Ads**
- Three actions: Accept All / Save Preferences / Reject All
- Fully translated (EN/DE) via `next-intl` translations namespace `cookies`
- Reopenable via footer "Cookie Settings" button (`CookieSettingsButton.tsx`) which dispatches the `cookie-settings-open` custom event

> The banner is placed in `app/[locale]/layout.tsx` (inside `NextIntlClientProvider`) — not in the root layout — because it uses `useTranslations`.

---

### gtag.js Loading

In `app/layout.tsx`:

1. `beforeInteractive` — Consent Mode v2 defaults (see above)
2. `afterInteractive` — `gtag.js` script tag (`strategy="afterInteractive"`)
3. `afterInteractive` — gtag init: configures GA4 with `send_page_view: false` (SPA handles pageviews manually) and configures Ads tag

---

### SPA Pageview Tracking

Component: `app/_components/NavigationEvents/index.tsx`

Tracks pageviews on client-side navigation using `usePathname`. Skips the first render (which is the server-rendered page load, already tracked by gtag itself) via a `useRef(true)` guard:

```ts
useEffect(() => {
  if (isFirst.current) { isFirst.current = false; return }
  trackPageview(pathname)
}, [pathname])
```

Rendered in `app/layout.tsx` to cover all routes.

---

### Analytics Functions

All tracking functions are in `lib/analytics.ts`:

| Function | GA4 Event | Triggered From |
|----------|-----------|---------------|
| `trackPageview(url)` | `config` (page_path) | `NavigationEvents` on route change |
| `trackSearch({arrival, departure, guests})` | `search` | `CheckInForm` on submit |
| `trackViewRoom({roomId, roomName, price})` | `view_item` | `RoomViewTracker` on room detail mount |
| `trackBeginCheckout({value, roomName})` | `begin_checkout` | Checkout page on first render |
| `trackPurchase({...})` | `purchase` + `conversion` | Success page after payment |

---

### Conversion Funnel

```
search (dates entered)
  → view_item (room detail page opened)
    → begin_checkout (payment page opened)
      → purchase (booking confirmed)
        → conversion (Google Ads — fires only if ADS_ID + ADS_LABEL set)
```

---

### Purchase Event Schema

```ts
gtag('event', 'purchase', {
  transaction_id: transactionReference | reservationId,
  currency: 'EUR',
  value: totalAmount,
  items: [{
    item_id: propertyId,       // e.g. 'CMH'
    item_name: roomName,
    item_category: 'Hotel Room',
    price: totalAmount,
    quantity: numberOfRooms,
  }],
  check_in_date: 'YYYY-MM-DD',
  check_out_date: 'YYYY-MM-DD',
  number_of_nights: N,
  number_of_rooms: N,
})
```

Google Ads conversion fires immediately after with `send_to: 'AW-ID/LABEL'`.

---

### Key Files

| File | Purpose |
|------|---------|
| `lib/analytics.ts` | Consent management + all track functions |
| `types/gtag.d.ts` | Global `window.gtag` / `window.dataLayer` type declarations |
| `app/layout.tsx` | Consent Mode v2 script + gtag.js loading |
| `app/[locale]/layout.tsx` | Cookie consent banner (needs next-intl) |
| `app/_components/NavigationEvents/index.tsx` | SPA pageview tracking |
| `app/_components/CookieConsent/CookieConsentBanner.tsx` | GDPR cookie banner UI |
| `app/_components/CookieConsent/CookieSettingsButton.tsx` | Footer link to reopen banner |
| `app/[locale]/(main)/rooms/[id]/components/RoomViewTracker.tsx` | view_item tracking |
