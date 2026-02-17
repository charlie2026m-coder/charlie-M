import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import { getSingleRoom } from '@/services/getSingleRoom'
import Availability from './components/Availability'
import NoCapacityWarning from './components/NoCapacityWarning'
import NoAvailabilityCard from './components/NoAvailabilityCard'
import RoomErrorCard from './components/RoomErrorCard'
import { calculateNights, getServiceAvailabilityById } from '@/lib/utils'
import type { Metadata } from 'next'
import { RATE_PLANS } from '@/lib/Constants';
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
  
  try {
    const rooms = await getSingleRoom(id, from, to, adults)
    
    if ('error' in rooms) {
      console.error('Error in generateMetadata for room:', id, rooms.error);
      return {
        title: isGerman ? 'Zimmer nicht gefunden' : 'Room not found',
        description: isGerman ? 'Das gesuchte Zimmer wurde nicht gefunden.' : 'The room you are looking for was not found.',
        robots: {
          index: false,
          follow: false
        }
      }
    }

    if (!rooms || rooms.length === 0) {
      console.log('No rooms found in generateMetadata for ID:', id);
      return {
        title: isGerman ? 'Zimmer nicht verfügbar' : 'Room not available',
        description: isGerman ? 'Das Zimmer ist derzeit nicht verfügbar.' : 'The room is currently not available.',
        robots: {
          index: false,
          follow: false
        }
      }
    }

    const nights = calculateNights(from as string, to as string)
    const type = nights > 7 ? RATE_PLANS.LONG_STAY : RATE_PLANS.STANDARD;
    const filteredRooms = rooms.filter(room => room.ratePlan.code.includes(type))
    const room = filteredRooms[0]
    
    if (!room) {
      console.error('Room data is undefined in generateMetadata for ID:', id);
      return {
        title: isGerman ? 'Zimmer nicht gefunden' : 'Room not found',
        description: isGerman ? 'Das gesuchte Zimmer wurde nicht gefunden.' : 'The room you are looking for was not found.',
        robots: {
          index: false,
          follow: false
        }
      }
    }
    
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
  } catch (error) {
    console.error('Unexpected error in generateMetadata for room:', id, error);
    return {
      title: isGerman ? 'Fehler beim Laden' : 'Error loading room',
      description: isGerman ? 'Ein Fehler ist aufgetreten.' : 'An error occurred.',
      robots: {
        index: false,
        follow: false
      }
    }
  }
}

const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params
  const { from, to, adults, children } = await searchParams
  
  try {
    const [rooms, babyBedAvailability] = await Promise.all([
      getSingleRoom(id, from, to, adults),
      getServiceAvailabilityById(from, to, 'CMH-BAB')
    ])
    
    // Handle error from getSingleRoom
    if ('error' in rooms) {
      console.error('Error loading room:', rooms.error);
      console.error('Room ID:', id);
      return (
        <div className='flex flex-col relative pt-10 flex-1'>
          <RoomErrorCard />
        </div>
      )
    }

    // Handle empty rooms array
    if (!rooms || rooms.length === 0) {
      console.log('No rooms found for ID:', id);
      console.log('Search params:', { from, to, adults, children });
      return (
        <div className='flex flex-col relative pt-10 flex-1'>
          <NoAvailabilityCard from={from} to={to} />
        </div>
      )
    }

    const room = rooms[0]
    
    // Handle missing room data
    if (!room) {
      console.error('Room data is undefined for ID:', id);
      return (
        <div className='flex flex-col relative pt-10 flex-1'>
          <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>
            <RoomErrorCard />
          </div>
        </div>
      )
    }

    const totalAdults = adults ? Number(adults) : 1
    const maxCapacity = room.availableUnits * room.maxPersons
    const hasEnoughCapacity = totalAdults <= maxCapacity
    const isKidsBedAvailable = room.attributes?.includes('kids') || false

    return (
      <div className='flex flex-col relative pt-10 flex-1'>
        <PhotoGallery images={room.images} roomName={room.name} />
        <div className='grid grid-cols-1  lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>

        {hasEnoughCapacity 
          ? <div className='col-span-2 xl:col-span-3 flex flex-col'>
              <RoomContent room={room} isRoomInfo={true} />
              <Availability 
                id={id}
                from={from}
                to={to}
                children={children}
                adults={adults}
              />
            </div>
            : <NoCapacityWarning 
                totalAdults={totalAdults}
                from={from}
                to={to}
                adults={adults}
                children={children}
              />
          }
          <div className='col-span-1'>
            <BookingForm 
              id={id} 
              rooms={rooms}
              params={{ 
                from: from || undefined,
                to: to || undefined, 
                adults: adults || undefined, 
                children: children || undefined
              }}
              babyBedAvailability={babyBedAvailability}
              isKidsBedAvailable={isKidsBedAvailable}
            />   
          </div>
        </div>
      </div>
    )
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error in RoomPage:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Room ID:', id);
    console.error('Search params:', { from, to, adults, children });
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