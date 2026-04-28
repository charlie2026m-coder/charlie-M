import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { HOTEL_INFO } from "@/lib/Constants";
import { NavigationEvents } from "@/app/_components/NavigationEvents";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const primaryTagId = GA_ID ?? ADS_ID;

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
    "telephone": HOTEL_INFO.telephone,
    "url": siteUrl,
    "priceRange": HOTEL_INFO.priceRange,
    "starRating": {
      "@type": "Rating",
      "ratingValue": HOTEL_INFO.starRating.toString()
    }
  };

  return (
    <html lang={locale}>
      <head>
        <link rel="prefetch" href="/rooms" />
        <link rel="prefetch" href="/de/rooms" />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased flex flex-col min-h-screen relative`}>
        {/* JSON-LD for Google */}
        <Script id="hotel-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }} />

        {/* Consent Mode v2 — set defaults before gtag.js loads */}
        {primaryTagId && (
          <Script id="consent-init" strategy="beforeInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
          `}</Script>
        )}

        {/* Google tag (gtag.js) */}
        {primaryTagId && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${primaryTagId}`}
            strategy="afterInteractive"
          />
        )}
        {primaryTagId && (
          <Script id="gtag-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            ${GA_ID ? `gtag('config', '${GA_ID}', { send_page_view: false });` : ''}
            ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ''}
          `}</Script>
        )}

        {children}
        <NavigationEvents />
      </body>
    </html>
  );
}
