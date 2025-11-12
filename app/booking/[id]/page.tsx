'use client'
import Steps from './components/Steps'
import PhotoGallery from '../../rooms/[id]/components/PhotoGallery'
import dayjs from 'dayjs'
import { getPath } from '@/lib/utils'
import { useParams, useSearchParams } from 'next/navigation'
import { useRoomById } from '@/app/hooks/useRooms'
import ExtrasSection from './components/ExtrasSection'
import RefundCard from './components/RefundCard'
import BookingMenu from './components/BookingMenu'
import RoomContent from '@/app/rooms/[id]/components/RoomContent'
import { useState } from 'react'

const BookingPage = () => {
  const params = useParams()
  const id = params.id as string;
  
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const adults = searchParams.get('adults')
  const children = searchParams.get('children')
  
  const today = dayjs().format('YYYY-MM-DD')
  const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')
  
  const queryString = getPath({ 
    from: from || today, 
    to: to || nextYear, 
    adults: adults || '1', 
    children: children || '0'
  })

  const { data: room, isLoading, isError } = useRoomById(id, queryString);
  const [extra, setExtra] = useState<{ image: string, title: string, price: number }[]>([]);

  if (isError) return <div>Error: {(isError as unknown as Error).message}</div>

  const addExtra = (item: { image: string, title: string, price: number }) => {
    setExtra([...extra, item])
  }

  return (
    <section className='container px-[100px] pt-8'>
      <Steps step={1} />
      <PhotoGallery />
      <div className='grid grid-cols-4 mb-[30px]'>

        <div className='col-span-3 flex flex-col pr-10'>
          <RoomContent room={room} isLoading={isLoading} />
          <ExtrasSection
            setExtra={addExtra}
            extras={extras}
            specialPackages={specialPackages}
            externalExtras={externalExtras}
          />
        </div>
        <div className='col-span-1 gap-5 flex flex-col'>
          <RefundCard />
          <BookingMenu 
            dateRange={{ from: new Date(from || today), to: new Date(to || nextYear) }} 
            extras={extra}
          />

        </div>
    </div>
    </section>
  )
}

export default BookingPage

const extras = [
  { image: '/images/extra-1.png', title: 'Extra Bed', price: 10 },
  { image: '/images/extra-2.png', title: 'Extra Bed', price: 10 },
  { image: '/images/extra-3.png', title: 'Extra Bed', price: 10 },
  { image: '/images/extra-1.png', title: 'Extra Bed', price: 50 },
  { image: '/images/extra-2.png', title: 'Extra Bed', price: 30 },
  { image: '/images/extra-3.png', title: 'Extra Bed', price: 20 },
]
const specialPackages = [
  { image: '/images/special-1.png', title: 'Extra Bed', price: 120 },
  { image: '/images/special-2.png', title: 'Extra Bed', price: 75 },
  { image: '/images/special-3.png', title: 'Extra Bed', price: 3 },
] 
const externalExtras = [
  { image: '/images/external-1.jpg', title: 'Car Rental', price: 10 },
  { image: '/images/external-2.png', title: 'Airport Transfer', price: 50 },
  { image: '/images/external-3.png', title: 'Boat Rental', price: 30 },
  { image: '/images/external-4.jpg', title: 'Helicopter Tour', price: 10 },
]