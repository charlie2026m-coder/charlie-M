'use client'
import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import { Link } from '@/navigation'
import { useState, useEffect } from 'react'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import ReservationCard from '../components/ReservationCard'
import { useReservations } from '@/app/hooks/useReservations'
import { useProfileStore } from '@/store/useProfile'
import { Spinner } from '@/app/_components/ui/spinner'
import { Reservation } from '@/types/apaleo'

const ITEMS_PER_PAGE = 3

const ReservationsTable = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const page = currentPage + 1 // Convert 0-based to 1-based
  const { reservationFilter } = useProfileStore()
  
  const { data, isLoading, isError, isFetching } = useReservations(page, reservationFilter)
  // Reset page to 0 when filter changes
  useEffect(() => {
    setCurrentPage(0)
  }, [reservationFilter])

  if (isError) {
    return <div className='text-center py-10 text-red-500'>Error loading reservations</div>
  }

  // Show empty state if no reservations
  if (data && data.count === 0) {
    return <NoReservations />
  }

  // Calculate pagination (use data or default to 0)
  const totalPages = data ? Math.ceil(data.count / ITEMS_PER_PAGE) : 0

  return (
    <>
      <div className='flex flex-col gap-3 mb-6 relative min-h-[400px]'>
        {/* Show loading overlay only when fetching new data but we have old data */}
        {isFetching && data && (
          <div className='absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg'>
              <Spinner /> Loading...
          </div>
        )}
        
        {/* Show cards if we have data */}
        {data?.reservations.map((item: Reservation, index: number) => (
          <ReservationCard key={item.id + index} reservation={item} />
        ))}
        
        {/* Show loading only on first load (no data at all) */}
        {!data && isLoading && (
          <div className='flex flex-1 items-center justify-center h-[400px]'>
            <div className='flex items-center gap-2'>
              <Spinner /> Loading...
            </div>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <CustomPagination 
          totalPages={totalPages} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
        />
      )}
    </>
  )
}

export default ReservationsTable;

const NoReservations = () => {
  return (
    <div className='flex items-center justify-center w-full flex-col flex-1'>
      <Image src="/images/no-reservations.svg" alt="no reservations" width={166} height={250} priority className='w-[166px] h-[250px]' />
      <p className='text-sm text-gray-500 mb-5'>You haven't booked any rooms yet</p>
      <Link href='/rooms'>
        <Button className=' h-[45px] w-[300px]' >Book now</Button>
      </Link>
    </div>
  )
}
