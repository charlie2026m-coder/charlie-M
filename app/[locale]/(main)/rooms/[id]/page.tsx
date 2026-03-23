import PhotoGallery from './components/PhotoGallery'
import BookingForm from './components/BookingForm'
import RoomContent from './components/RoomContent'
import { getRoom } from '@/app/actions/apaleo/rooms/getRoom'
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import Availability from './components/Availability'
import NoCapacityWarning from './components/NoCapacityWarning'
import NoAvailabilityCard from './components/NoAvailabilityCard'
import RoomErrorCard from './components/RoomErrorCard'
import { calculateNights, getServiceAvailabilityById, selectBestRoomOffers } from '@/lib/utils'
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
  
  try {
    const rooms = await getRoom(id, from, to, adults, locale)
    
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
    const filteredRooms = selectBestRoomOffers(rooms, nights)
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
  const { id, locale } = await params
  const { from, to, adults, children } = await searchParams
  
  try {
    const [apaleoResult, allRoomsDetails, babyBedAvailability] = await Promise.all([
      getRoom(id, from, to, adults, locale),
      getRoomDetails(),
      getServiceAvailabilityById(from, to, 'CMH-BAB')
    ])

    // Supabase data — always available
    const roomDetail = allRoomsDetails.find(r => r.id === id)
    if (!roomDetail) {
      return (
        <div className='flex flex-col relative pt-10 flex-1'>
          <RoomErrorCard />
        </div>
      )
    }

    // Apaleo data — optional
    const hasApaleoError = 'error' in apaleoResult
    const nights = calculateNights(from as string, to as string)
    const filteredRooms = hasApaleoError ? [] : selectBestRoomOffers(apaleoResult, nights)
    const room = filteredRooms[0] ?? null

    // Build a display object from Supabase — used for photos, content, attributes
    const displayRoom = room ?? {
      id: roomDetail.id,
      name: roomDetail.title_en,
      description: roomDetail.description_en ?? '',
      images: roomDetail.photos,
      attributes: roomDetail.attributes,
      size: roomDetail.size,
      maxPersons: roomDetail.max_persons,
    }

    const totalAdults = adults ? Number(adults) : 1
    const maxCapacity = room ? room.availableUnits * room.maxPersons : roomDetail.max_persons
    const hasEnoughCapacity = totalAdults <= maxCapacity
    const isKidsBedAvailable = roomDetail.attributes?.includes('kids') || false
    const isUnavailable = !room

    return (
      <div className='flex flex-col relative pt-10 flex-1'>
        <PhotoGallery images={displayRoom.images} roomName={displayRoom.name} />
        <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]'>
          {hasEnoughCapacity
            ? <div className='col-span-2 xl:col-span-3 flex flex-col'>
                <RoomContent room={displayRoom as any} isRoomInfo={true} />
                {!isUnavailable && (
                  <Availability
                    id={id}
                    from={from}
                    to={to}
                    children={children}
                    adults={adults}
                  />
                )}
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
            {isUnavailable
              ? <NoAvailabilityCard from={from} to={to} />
              : <BookingForm
                  id={id}
                  rooms={filteredRooms}
                  params={{
                    from: from || undefined,
                    to: to || undefined,
                    adults: adults || undefined,
                    children: children || undefined
                  }}
                  babyBedAvailability={babyBedAvailability}
                  isKidsBedAvailable={isKidsBedAvailable}
                />
            }
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in RoomPage:', error);
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