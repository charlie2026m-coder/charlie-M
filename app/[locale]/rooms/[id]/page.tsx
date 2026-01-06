import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import { getSingleRoom } from '@/services/getSingleRoom'
import ErrorCard from '../components/ErrorCard'
import Availability from './components/Availability'
import { calculateNights } from '@/lib/utils'
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

export async function generateMetadata({ params, searchParams }: IParams): Promise<Metadata> {
  const { id, locale } = await params
  const { from, to, adults, children } = await searchParams
  const isGerman = locale === 'de'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de"
  
  const hasQueryParams = !!(from || to || adults || children)
  
  const rooms = await getSingleRoom(id, from, to)
  
  if ('error' in rooms) {
    return {
      title: isGerman ? 'Zimmer nicht gefunden' : 'Room not found',
      description: isGerman ? 'Das gesuchte Zimmer wurde nicht gefunden.' : 'The room you are looking for was not found.',
      robots: {
        index: false,
        follow: false
      }
    }
  }

  const nights = calculateNights(from as string, to as string)
  const type = nights > 7 ? 'LONG_STAY' : 'BAR_WEB'
  const filteredRooms = rooms.filter(room => room.code.includes(type))
  const room = filteredRooms[0]
  
  const roomName = room?.name || 'Room'
  const roomDescription = room?.description || ''
  const cleanDescription = roomDescription.replace(/<[^>]*>/g, '').substring(0, 155)
  
  const canonicalUrl = isGerman 
    ? `${siteUrl}/de/rooms/${id}` 
    : `${siteUrl}/rooms/${id}`

  const metadata = {
    en: {
      title: `${roomName} | Charlie M Hotel Berlin`,
      description: cleanDescription || `Book ${roomName} at Charlie M Hotel in Berlin Mitte. Modern accommodation with smart amenities near Checkpoint Charlie. View availability and prices.`,
    },
    de: {
      title: `${roomName} | Charlie M Hotel Berlin`,
      description: cleanDescription || `Buchen Sie ${roomName} im Charlie M Hotel in Berlin Mitte. Moderne Unterkunft mit smarter Ausstattung in der Nähe vom Checkpoint Charlie. Verfügbarkeit und Preise ansehen.`,
    }
  }

  const currentMeta = isGerman ? metadata.de : metadata.en

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
      siteName: 'Charlie M Hotel',
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
      images: room?.images?.[0] ? [
        {
          url: room.images[0],
          width: 1200,
          height: 630,
          alt: roomName
        }
      ] : [
        {
          url: '/images/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Charlie M Hotel'
        }
      ]
    },
    
    twitter: {
      card: 'summary_large_image',
      title: currentMeta.title,
      description: currentMeta.description,
      images: room?.images?.[0] ? [room.images[0]] : ['/images/og-image.jpg']
    },
    
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/rooms/${id}`,
        de: `${siteUrl}/de/rooms/${id}`
      }
    }
  }
}

const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params
  const { from, to, adults, children } = await searchParams
  
  const rooms = await getSingleRoom(id, from, to)
  if ('error' in rooms) return <ErrorCard isSingleRoom={true} link='/rooms' />
  const nights = calculateNights(from as string, to as string);
  const type = nights > 7  ? 'LONG_STAY' : 'BAR_WEB';
  const filteredRooms = rooms.filter(room => room.code.includes(type));
  const room = filteredRooms[0]

  return (
    <div className='flex flex-col relative container px-4 md:px-10 xl:px-[100px] pt-10 flex-1'>
      <PhotoGallery images={room.images} roomName={room.name} />
      <div className='grid grid-cols-1  lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>

        <div className='col-span-2 xl:col-span-3 flex flex-col'>
           <RoomContent room={room} />
            <Availability 
              id={id}
              from={from}
              to={to}
              children={children}
              adults={adults}
            />
        </div>
        <div className='col-span-1'>
          <BookingForm 
            id={id} 
            room={room}
            params={{ 
              from: from || undefined,
              to: to || undefined, 
              adults: adults || undefined, 
              children: children || undefined
            }} 
          />   
        </div>
      </div>
    </div>
  )
}

export default RoomPage