import CheckInForm from '@/app/[locale]/home/components/CheckInForm'
import Filters from './components/Filters'
import FiltersMobile from './components/FiltersMobile'
import RoomsList from './components/RoomsList'
import { UrlParams } from '@/types/apaleo'
import ErrorCard from '@/app/[locale]/rooms/components/ErrorCard'
import NotFoundCard from './[id]/components/NotFoundCard'
import { getAvailableRooms } from '@/services/getAvailableRooms'
import type { Metadata } from 'next'
import { HOTEL_INFO } from '@/lib/Constants';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: UrlParams;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
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

const RoomsPage = async ({ searchParams } : Props) => {
  const { from, to, adults, children } = await searchParams;
  const guests = (adults ? Number(adults) : 1) + (children ? Number(children) : 0);
  const rooms = await getAvailableRooms(from, to, guests);
  if ('error' in rooms || !rooms) return <ErrorCard />
  if (rooms.length === 0) return <NotFoundCard text='No rooms found' />


  return (
    <section className='flex flex-col container px-4 md:px-10 xl:px-[100px] pt-10'>
      <h1 className='text-[35px] md:text-6xl font-bold jakarta mb-6'>Charlie M — Rooms</h1>
      <p className='text-[15px] text-dark inter font-[400] mb-7'> Our rooms at Charlie M are designed to feel inviting from the moment you arrive. Modern interiors, great beds, and thoughtful amenities create a calm space to unwind after a day in the city. Each room category has its own character — from private balconies to shared terraces — so you can choose the one that fits your stay.</p>
      <CheckInForm 
        className="w-full mb-5 md:mb-10 "
        params={{ from, to, adults, children }}  
      />
      <Filters />
      <FiltersMobile />
      <RoomsList rooms={rooms} params={{ from, to, adults, children }} />
    </section>
  )
}

export default RoomsPage