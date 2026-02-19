import Filters from './components/Filters'
import RoomsList from './components/RoomsList'
import { UrlParams } from '@/types/apaleo'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import NotFoundCard from './[id]/components/NotFoundCard'
import { getAvailableRooms } from '@/services/getAvailableRooms'
import type { Metadata } from 'next'
import { HOTEL_INFO, RATE_PLANS } from '@/lib/Constants';
import StickyCheckInFormRooms from './components/StickyCheckInFormRooms'
import { calculateNights, getServiceAvailabilityById } from '@/lib/utils'

export const revalidate = 60
  
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: UrlParams;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isGerman = locale === 'de';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
  
  const { from, to, adults, children } = await searchParams;
  const hasQueryParams = !!(from || to || adults || children);
  
  const canonicalUrl = isGerman ? `${siteUrl}/de/rooms` : `${siteUrl}/rooms`;

  const metadata = {
    en: {
      title: 'Rooms & Suites | Charlie M Hotel Berlin Mitte',
      description: 'Explore our modern rooms at Charlie M Hotel in Berlin Mitte. Comfortable beds, smart amenities, private balconies. Book your perfect room near Checkpoint Charlie.',

    },
    de: {
      title: 'Zimmer & Suiten | Charlie M Hotel Berlin Mitte',
      description: 'Entdecken Sie unsere modernen Zimmer im Charlie M Hotel in Berlin Mitte. Komfortable Betten, smarte Ausstattung, private Balkone. Buchen Sie Ihr perfektes Zimmer in der Nähe vom Checkpoint Charlie.',

    }
  };

  const currentMeta = isGerman ? metadata.de : metadata.en;

  return {
    title: currentMeta.title,
    description: currentMeta.description,
    
    robots: {
      index: !hasQueryParams,
      follow: !hasQueryParams,
      noarchive: hasQueryParams,
      googleBot: {
        index: !hasQueryParams,
        follow: !hasQueryParams,
        'max-image-preview': 'large',
        'max-snippet': -1,
      }
    },
    
    openGraph: {
      title: currentMeta.title,
      description: currentMeta.description,
      url: canonicalUrl,
      siteName: HOTEL_INFO.name,
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Charlie M Hotel Rooms'
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
        en: `${siteUrl}/rooms`,
        de: `${siteUrl}/de/rooms`
      }
    }
  };
}

const RoomsPage = async ({ params, searchParams } : Props) => {
  const { locale } = await params;
  const { from, to, adults, children } = await searchParams;
  
  try {
    const adultsCount = adults ? Number(adults) : 1;
    
    const [rooms, babyBedAvailability] = await Promise.all([
      getAvailableRooms(from, to, adultsCount, locale),
      from && to 
        ? getServiceAvailabilityById(from, to, 'CMH-BAB')
        : Promise.resolve({ isAvailable: false, count: 0 })
    ]);
    
    // Handle error from getAvailableRooms
    if ('error' in rooms) {
      console.error('Error loading rooms:', rooms.error);
      console.error('Search params:', { from, to, adults, children });
      return (
        <>
          <StickyCheckInFormRooms params={{ from, to, adults, children }} />
          <Filters />
          <ErrorCard />
        </>
      )
    }
    
    // Handle empty rooms array
    if (!rooms || rooms.length === 0) {
      console.log('No rooms available for search params:', { from, to, adults, children });
      return (
        <>
          <StickyCheckInFormRooms params={{ from, to, adults, children }} />
          <Filters />
          <NotFoundCard />
        </>
      )
    }
    
    const nights = calculateNights(from as string, to as string);
    const ratePlan = nights > 7  ? RATE_PLANS.LONG_STAY : RATE_PLANS.STANDARD;
    const standardPriceRooms = rooms.filter(room => room.ratePlan.code.includes(ratePlan))
    
    // Handle no standard price rooms
    if (standardPriceRooms.length === 0) {
      console.log('No standard price rooms available for:', { ratePlan, nights });
      return (
        <>
          <StickyCheckInFormRooms params={{ from, to, adults, children }} />
          <Filters />
          <NotFoundCard />
        </>
      )
    }
    
    return (
      <>
        <StickyCheckInFormRooms params={{ from, to, adults, children }} />
        <Filters />
        <RoomsList 
          rooms={standardPriceRooms} 
          params={{ from, to, adults, children }} 
          isBabyBedAvailable={babyBedAvailability}
        />
      </>
    )
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error in RoomsPage:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return (
      <>
        <StickyCheckInFormRooms params={{ from, to, adults, children }} />
        <Filters />
        <ErrorCard />
      </>
    )
  }
}

export default RoomsPage