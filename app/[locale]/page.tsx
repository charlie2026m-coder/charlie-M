import VideoSection from '@/app/[locale]/home/VideoSection';
import RoomsSection from '@/app/[locale]/home/RoomsSection';

import StickyCheckInForm from '@/app/[locale]/home/components/StickyCheckInForm';
import type { Metadata } from 'next';
import { HOTEL_INFO } from '@/lib/Constants';
import LocationSection from '@/app/[locale]/home/LocationSection';
import ConceptSection from './home/ConceptSection';
import ExperienceSection from './home/ExperienceSection';
import PersonalizeSection from './home/PersonalizeSection';
import DesignSection from './home/DesignSection';
import FAQSection from './home/FAQSection';
import ReviewsSection from './home/ReviewsSection';

type Props = {params: Promise<{ locale: string }>};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const isGerman = locale === 'de';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
  
  const pageUrl = isGerman ? `${siteUrl}/de` : siteUrl;

  const metadata = {
    en: {
      title: 'Charlie M Hotel | Hotel in Berlin Mitte near Checkpoint Charlie',
      description: 'Modern hotel in Berlin Mitte on Friedrichstraße, steps from Checkpoint Charlie. Comfortable rooms, essential amenities, and automated online check-in.',
    },
    de: {
      title: 'Charlie M Hotel | Hotel in Berlin Mitte nahe Checkpoint Charlie',
      description: 'Modernes Hotel in Berlin Mitte an der Friedrichstraße, nur wenige Schritte vom Checkpoint Charlie. Komfortable Zimmer, wichtige Ausstattung und automatisierter Online-Check-in.',
    }
  };

  const currentMeta = isGerman ? metadata.de : metadata.en;

  return {
    title: currentMeta.title,
    description: currentMeta.description,
    
    openGraph: {
      title: currentMeta.title,
      description: currentMeta.description,
      url: pageUrl,
      siteName: HOTEL_INFO.name,
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Charlie M Hotel Berlin'
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
      canonical: pageUrl,
      languages: {
        en: siteUrl,
        de: `${siteUrl}/${locale}`
      }
    }
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await Promise.resolve(params);

  return (
      <section className="flex flex-col">
        <VideoSection locale={locale} />
        <StickyCheckInForm />
        <RoomsSection locale={locale} />
        <LocationSection />
        <ConceptSection />
        <ExperienceSection />
        <PersonalizeSection locale={locale} />
        <DesignSection locale={locale} />
        <FAQSection />
        <ReviewsSection />
        {/* <InstagramSection /> */}
      </section>
  );
}
