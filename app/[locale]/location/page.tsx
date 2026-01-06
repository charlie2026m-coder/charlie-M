import LocationSection from './components/LocationSection'
import LifeStyle from './components/LifeStyle'
import MapSection from './components/MapSection'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const isGerman = locale === 'de';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
  
  const canonicalUrl = isGerman ? `${siteUrl}/de/location` : `${siteUrl}/location`;

  const metadata = {
    en: {
      title: 'Location | Charlie M Hotel near Checkpoint Charlie Berlin',
      description: 'Charlie M Hotel is located in the heart of Berlin Mitte on Friedrichstraße. Walking distance to Checkpoint Charlie (5 min), Brandenburg Gate (20 min), Gendarmenmarkt (10 min), Potsdamer Platz (15 min). Perfect location for exploring Berlin.',

    },
    de: {
      title: 'Standort | Charlie M Hotel in der Nähe von Checkpoint Charlie Berlin',
      description: 'Das Charlie M Hotel befindet sich im Herzen von Berlin Mitte an der Friedrichstraße. Fußläufig zum Checkpoint Charlie (5 Min), Brandenburger Tor (20 Min), Gendarmenmarkt (10 Min), Potsdamer Platz (15 Min). Perfekte Lage für Berlin-Erkundung.',

    }
  };

  const currentMeta = isGerman ? metadata.de : metadata.en;

  return {
    title: currentMeta.title,
    description: currentMeta.description,
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      }
    },
    
    openGraph: {
      title: currentMeta.title,
      description: currentMeta.description,
      url: canonicalUrl,
      siteName: 'Charlie M Hotel',
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Charlie M Hotel Location'
        }
      ]
    },
    
    twitter: {
      card: 'summary_large_image',
      title: currentMeta.title,
      description: currentMeta.description,
      images: ['/images/og-image.jpg']
    },
    
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/location`,
        de: `${siteUrl}/de/location`
      }
    }
  };
}

const LocationPage = () => {
  return (
    <>
      <LocationSection />
      <MapSection />
      <LifeStyle />
    </>
  )
}

export default LocationPage