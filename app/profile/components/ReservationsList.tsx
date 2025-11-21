'use client'

import Dot from '@/app/_components/ui/dot'
import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import Link from 'next/link'
import StatusBadge from '@/app/_components/ui/StatusBadge'
import Price from '@/app/_components/ui/price'
import { Separator } from '@/app/_components/ui/separator'
import BookingCode from '../reservations/components/ui/bookingCode'
import { useState, useMemo } from 'react'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import { Beds24RoomType } from '@/types/beds24'

const ITEMS_PER_PAGE = 5

const ReservationsList = () => {
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
          {displayedReservations.length > 0 && displayedReservations.map((item, index) => {
            const isNoCodes = !item.code && !item.roomNumber;
            return (
            <div key={item.id+index} className='flex flex-col bg-white border rounded-2xl p-3 '>
              <div className='flex  mb-3'>
                <div className='flex items-center'>
                  <Image src={item.image} alt={item.name} width={125} height={125} className='size-[125px] object-cover rounded-2xl mr-3' />
                </div>
                <div className='flex flex-col gap-2.5 flex-1'>
                  <div className='flex flex-1 justify-between pb-3 border-b'>
                    <div className='flex flex-col'>
                      <div className='flex flex-col gap-2.5'>
                        <h2 className='text-xl jakarta font-bold'>{item.name}</h2>
                        <div className='flex lg:hidden items-center justify-center px-2.5 py-1 text-brown rounded-full shadow text-sm self-start'>{item.category}</div>
                        <div className='flex items-center gap-2'>
                          <div className='hidden lg:flex items-center justify-center px-2.5 py-1 text-brown rounded-full shadow text-sm self-start'>{item.category}</div>
                          <RoomParamsRow item={item as unknown as Beds24RoomType} />
                        </div>
                      </div>
                    </div>
                    
                    <div className='flex flex-col items-end gap-2'>
                      <div className='flex items-center self-start gap-2.5'>
                        <StatusBadge status={item.checkInStatus}  isDot />
                        <StatusBadge status={item.status} />

                        <div className='text-sm '>id:237544</div>
                      </div>
                      <Price
                        price={item.price.toFixed(2)}
                        className='h-[30px]'
                      />
                    </div>
                  </div>
                  <div className='flex items-center gap-2.5'>
                    <div>Check In: {item.checkIn}</div>
                    <Separator orientation='vertical' />
                    <div>Check Out: {item.checkOut}</div>
                    <Separator orientation='vertical' />
                    <div>Guests: {item.people}</div>
                    {isNoCodes &&<Button variant='outline' className='h-[35px] ml-auto text-sm'>Check details</Button>}

                  </div>
                </div>
              </div>

              <div className='flex gap-2 items-center'>
                <BookingCode code={item.code} type='code' />
                <BookingCode code={item.roomNumber} type='room' />
                {!isNoCodes &&<Button variant='outline' className='h-[35px] ml-auto text-sm'>Check details</Button>}
              </div>

            </div>
          )})}
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

export default ReservationsList;

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