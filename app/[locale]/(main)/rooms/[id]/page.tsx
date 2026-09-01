import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import { getRoomDetails, getRoomById } from '@/app/actions/supabase/rooms/getRoomDetails'
import RoomErrorCard from './components/RoomErrorCard'
import { RoomViewTracker } from './components/RoomViewTracker'
import RoomReviews from './components/RoomReviews'
import GoodToKnow from './components/GoodToKnow'
import ScrollToTopOnMount from '@/app/_components/ui/ScrollToTopOnMount'
import type { Metadata } from 'next'
interface IParams {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ 
    from?: string
    to?: string
    adults?: string
    children?: string
  }>
}

export async function generateStaticParams() {
  const rooms = await getRoomDetails();
  return rooms.map((room) => ({ id: room.id }));
}

export async function generateMetadata({ params, searchParams }: IParams): Promise<Metadata> {
  const { id, locale } = await params
  const { from, to, adults, children } = await searchParams
  const isGerman = locale === 'de'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de"
  const hasQueryParams = !!(from || to || adults || children)

  const roomDetail = await getRoomById(id)

  if (!roomDetail) {
    return {
      title: isGerman ? 'Zimmer nicht gefunden' : 'Room not found',
      robots: { index: false, follow: false },
    }
  }

  const roomName = isGerman ? roomDetail.title_de : roomDetail.title_en
  const rawDescription = isGerman ? (roomDetail.description_de ?? '') : (roomDetail.description_en ?? '')
  const cleanDescription = rawDescription.replace(/<[^>]*>/g, '').substring(0, 155)
  const canonicalUrl = isGerman ? `${siteUrl}/de/rooms/${id}` : `${siteUrl}/rooms/${id}`
  const ogImage = roomDetail.photos?.[0] ?? '/images/og-image.jpg'

  const title = `${roomName} | Charlie M Hotel Berlin`
  const description = cleanDescription || (
    isGerman
      ? `Buchen Sie ${roomName} im Charlie M Hotel in Berlin Mitte. Moderne Unterkunft mit smarter Ausstattung in der Nähe vom Checkpoint Charlie.`
      : `Book ${roomName} at Charlie M Hotel in Berlin Mitte. Modern accommodation with smart amenities near Checkpoint Charlie.`
  )

  return {
    title,
    description,
    robots: {
      index: !hasQueryParams,
      follow: !hasQueryParams,
      noarchive: hasQueryParams,
      googleBot: {
        index: !hasQueryParams,
        follow: !hasQueryParams,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Charlie M Hotel',
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: roomName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/rooms/${id}`,
        de: `${siteUrl}/de/rooms/${id}`,
      },
    },
  }
}

const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id, locale } = await params
  const { from, to, adults, children } = await searchParams

  const roomDetail = await getRoomById(id)

  if (!roomDetail) {
    return (
      <div className='flex flex-col relative pt-10 flex-1'>
        <RoomErrorCard />
      </div>
    )
  }

  const isKidsBedAvailable = roomDetail.attributes?.includes('kids') || false
  const displayName = locale === 'de' ? roomDetail.title_de : roomDetail.title_en
  const displayDescription = locale === 'de' ? (roomDetail.description_de ?? '') : (roomDetail.description_en ?? '')

  const displayRoom = {
    id: roomDetail.id,
    name: displayName,
    description: displayDescription,
    images: roomDetail.photos,
    attributes: roomDetail.attributes ?? [],
    size: roomDetail.size,
    maxPersons: roomDetail.max_persons,
  }

  try {
    return (
      <div className='flex flex-col relative pt-10 flex-1'>
        <ScrollToTopOnMount />
        <RoomViewTracker roomId={displayRoom.id} roomName={displayRoom.name} />
        <PhotoGallery images={displayRoom.images} roomName={displayRoom.name} />
        <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>
          <div className='col-span-2 xl:col-span-3 flex flex-col'>
            <RoomContent room={displayRoom as any} isRoomInfo={true} />
          </div>
          <div className='col-span-1'>
            <BookingForm
              id={id}
              params={{ from, to, adults, children }}
              isKidsBedAvailable={isKidsBedAvailable}
              maxPersons={roomDetail.max_persons}
            />
          </div>
        </div>

        <GoodToKnow />
        <RoomReviews />
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in RoomPage:', error)
    return (
      <div className='flex flex-col relative pt-10 flex-1'>
        <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>
          <RoomErrorCard />
        </div>
      </div>
    )
  }
}

export default RoomPage