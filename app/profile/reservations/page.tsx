'use client'
import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import ReservationCard from './components/ReservationCard'
import { reservations } from '@/content/content'
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
    <div className='flex flex-col flex-1 px-3 lg:px-[30px]'>
      <div className='flex items-center gap-2 font-semibold text-2xl mb-5'>
        All Reservations
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
    <div className='flex items-center justify-center w-full flex-col flex-1'>
      <Image src="/images/no-reservations.svg" alt="no reservations" width={166} height={250} priority className='w-[166px] h-[250px]' />
      <p className='text-sm text-gray-500 mb-5'>You haven’t booked any rooms yet</p>
      <Link href='/rooms'>
        <Button className=' h-[45px] w-[300px]' >Book now</Button>
      </Link>
    </div>
  )
}

// const reservations: any[] = []
