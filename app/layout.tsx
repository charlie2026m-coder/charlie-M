import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { HOTEL_INFO } from "@/lib/Constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Charlie M Hotel | Hotel in Berlin Mitte near Checkpoint Charlie",
    template: "%s | Charlie M Hotel"
  },
  description: "Modern hotel in Berlin Mitte on Friedrichstraße, steps from Checkpoint Charlie. Comfortable rooms, essential amenities, and automated online check-in.",
  
  // Open Graph (Facebook, LinkedIn, WhatsApp)
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
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Charlie M Hotel | Hotel in Berlin Mitte near Checkpoint Charlie",
    description: "Modern hotel in Berlin Mitte on Friedrichstraße, steps from Checkpoint Charlie.",
    images: ["/images/og-image.jpg"]
  },
  
  // Robots - Disabled indexing temporarily
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
    }
  },
  
  // Icons
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
  // Get locale from params if available, default to 'en'
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || 'en';
  
  // JSON-LD structured data for Hotel
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
    <html lang={locale} style={{ overscrollBehaviorY: 'none' }}>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body {
              overscroll-behavior-y: none;
              overscroll-behavior: none;
            }
            body {
              position: relative;
            }
          `
        }} />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased flex flex-col min-h-screen relative`} style={{ overscrollBehaviorY: 'none', overscrollBehavior: 'none' }}>
        {/* JSON-LD for Google */}
        <Script
          id="hotel-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
