'use client'

import Dot from '@/app/_components/ui/dot'
import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import ReservationCard from './components/ReservationCard'

const ITEMS_PER_PAGE = 5

const Reservations = () => {
  const [currentPage, setCurrentPage] = useState(0)

  // Calculate pagination
  const totalPages = Math.ceil(reservations.length / ITEMS_PER_PAGE)
  
  // Get current page reservations
  const displayedReservations = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE
    return reservations.slice(start, start + ITEMS_PER_PAGE)
  }, [currentPage])

  return (
    <div className='flex flex-col flex-1'>
      <div className='flex items-center gap-2 font-semibold text-2xl mb-5'>
        <Dot size={15} color="blue" /> All Reservations
      </div>
        {reservations.length === 0 ? <NoReservations /> : <></>}
        <div className='flex flex-col gap-3 mb-6'>
          {displayedReservations.length > 0 && displayedReservations.map((item, index) => (
            <ReservationCard key={item.id+index} reservation={item} />
          ))}
        </div>

        {totalPages > 1 && (
          <CustomPagination 
            totalPages={totalPages} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage} 
          />
        )}
    </div>
  )
}

export default Reservations;

const NoReservations = () => {
  return (
    <div className='flex items-center justify-center w-full  flex-col gap-6 flex-1'>
      <Image src="/images/calendar-image.svg" alt="no reservations" width={180} height={104} priority className='w-[180px] h-[104px]' />
      <p className='text-sm text-gray-500'>You haven’t booked any rooms yet</p>
      <Link href='/rooms'>
        <Button className=' h-[45px] w-[300px]' >Book now</Button>
      </Link>
    </div>
  )
}

const reservations = [
  {
    id: 1,
    checkInStatus: 'Pending Check-in', 
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'upcoming',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
  },
  {
    id: 1,
    checkInStatus: 'Checked in', 
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'ongoing',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
    code: 232333,
    roomNumber: 77
  },
  {
    id: 1,
    checkInStatus: 'Checked out', 
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'completed',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
    code: 232333,
    roomNumber: 77
  },
  {
    id: 1,
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'cancelled',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
  },
  {
    id: 1,
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'completed',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
    code: 23233,
    roomNumber: 77
  },
  {
    id: 1,
    checkInStatus: 'Pending Check-in', 
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'upcoming',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
    code: 232333,
    roomNumber: 77
  },
  {
    id: 1,
    checkInStatus: 'Checked in', 
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'ongoing',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
  },
  {
    id: 1,
    checkInStatus: 'Checked out', 
    name: 'Cozy Retreat Suite',
    date: '2025-01-01',
    checkIn: '2025-01-01',
    checkOut: '2025-01-02',
    status: 'completed',
    image: '/images/reservation_1.jpg',
    category: 'Suite',
    people: 2,
    roomSize: 50,
    roomType: 'Suite',
    hasBalcony: true,
    price: 1245.50,
    code: 232333,
    roomNumber: 77
  },
]