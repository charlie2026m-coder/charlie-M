import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { HOTEL_INFO } from "@/lib/Constants";
import { NavigationEvents } from "@/app/_components/NavigationEvents";
import { GoogleAnalytics } from "@/app/_components/CookieConsent/GoogleAnalytics";
import { COOKIEBOT_CBID } from "@/lib/cookiebot";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Charlie M Hotel | Hotel in Berlin Mitte near Checkpoint Charlie",
    template: "%s | Charlie M Hotel"
  },
  description: "Modern hotel in Berlin Mitte on Friedrichstraße, steps from Checkpoint Charlie. Comfortable rooms, essential amenities, and automated online check-in.",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Charlie M Hotel",
    title: "Charlie M Hotel | Hotel in Berlin Mitte near Checkpoint Charlie",
    description: "Modern hotel in Berlin Mitte on Friedrichstraße, steps from Checkpoint Charlie. Comfortable rooms, essential amenities, and automated online check-in.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Charlie M Hotel Berlin"
      }
    ]
  },

  twitter: {
    card: "summary_large_image",
    title: "Charlie M Hotel | Hotel in Berlin Mitte near Checkpoint Charlie",
    description: "Modern hotel in Berlin Mitte on Friedrichstraße, steps from Checkpoint Charlie.",
    images: ["/images/og-image.jpg"]
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    }
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  }
};

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || 'en';

  const hotelSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Charlie M Hotel",
    "description": "Modern hotel in Berlin Mitte with automated check-in",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": HOTEL_INFO.address.streetAddress,
      "addressLocality": HOTEL_INFO.address.addressLocality,
      "addressRegion": HOTEL_INFO.address.addressRegion,
      "postalCode": HOTEL_INFO.address.postalCode,
      "addressCountry": HOTEL_INFO.address.addressCountry
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": HOTEL_INFO.geo.latitude,
      "longitude": HOTEL_INFO.geo.longitude
    },
    "telephone": HOTEL_INFO.telephone,
    "email": HOTEL_INFO.email,
    "url": siteUrl,
    "priceRange": HOTEL_INFO.priceRange,
    "numberOfRooms": HOTEL_INFO.numberOfRooms,
    "checkinTime": HOTEL_INFO.checkinTime,
    "checkoutTime": HOTEL_INFO.checkoutTime,
    "starRating": {
      "@type": "Rating",
      "ratingValue": HOTEL_INFO.starRating.toString()
    },
    // Straight from HOTEL_INFO so the markup can never claim a facility the
    // hotel does not actually have.
    "amenityFeature": HOTEL_INFO.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      "name": name
    }))
  };

  // Publisher identity. Separate from the Hotel node on purpose: Google reads
  // Organization for the knowledge panel (logo, contact), Hotel for the listing.
  const organizationSchema = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    "url": siteUrl,
    "logo": `${siteUrl}/images/logo-white.svg`,
    "name": "Charlie M Hotel",
    "description": "Modern hotel in Berlin Mitte with automated check-in",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": HOTEL_INFO.address.streetAddress,
      "addressLocality": HOTEL_INFO.address.addressLocality,
      "postalCode": HOTEL_INFO.address.postalCode,
      "addressCountry": HOTEL_INFO.address.addressCountry
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": HOTEL_INFO.telephone,
      "email": HOTEL_INFO.email,
      "contactType": "customer service"
    }
  };

  // Gives the search snippet a site path instead of a bare URL.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      }
    ]
  };

  return (
    <html lang={locale}>
      <head>
        {/* Cookiebot CMP — MUST be the first script so consent is resolved before
            any tracker can run. Manual blocking mode (no data-blockingmode="auto"):
            GA/Ads and Google Maps are gated in-app (GoogleAnalytics, MapWindow)
            keyed off Cookiebot consent, so nothing third-party loads before opt-in
            and Cookiebot never rewrites our functional/payment scripts. */}
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid={COOKIEBOT_CBID}
          strategy="beforeInteractive"
        />
        <link rel="prefetch" href="/rooms" />
        <link rel="prefetch" href="/de/rooms" />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased flex flex-col min-h-screen relative`}>
        {/* JSON-LD for Google */}
        {/* Plain <script>, not next/script: <Script> defers these into the RSC
            payload, so the structured data reached crawlers only after JS ran.
            A raw tag puts it in the served HTML where Google reads it. */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

        {children}
        {/* GA/Ads load only after Cookiebot consent (Consent Mode v2 in sync). */}
        <GoogleAnalytics />
        <NavigationEvents />
      </body>
    </html>
  );
}
