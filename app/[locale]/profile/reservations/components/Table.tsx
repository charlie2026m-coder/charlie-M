'use client'
import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import { Link } from '@/navigation'
import { useState, useEffect } from 'react'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import ReservationCard from '../components/ReservationCard'
import { useReservations, useGuestReservations } from '@/app/hooks/useReservations'
import { useProfileStore } from '@/store/useProfile'
import { Spinner } from '@/app/_components/ui/spinner'
import { Reservation } from '@/types/apaleo'
import { useTranslations } from 'next-intl'

const ITEMS_PER_PAGE = 3

interface ReservationsTableProps {
  addedReservations?: any[]
}

const ReservationsTable = ({ addedReservations = [] }: ReservationsTableProps) => {
  const t = useTranslations('profile')
  const [currentPage, setCurrentPage] = useState(0)
  const page = currentPage + 1
  const { reservationFilter, guestData, setGuestData } = useProfileStore()
  
  const [isGuestMode, setIsGuestMode] = useState(false)

  useEffect(() => {
    const guestMode = sessionStorage.getItem('guestMode')
    setIsGuestMode(guestMode === 'true')
    
    // Load guestData from sessionStorage if not in store
    if (guestMode === 'true' && !guestData) {
      const storedData = sessionStorage.getItem('guestData')
      if (storedData) {
        try {
          setGuestData(JSON.parse(storedData))
        } catch (e) {
          console.error('Failed to parse guest data:', e)
        }
      }
    }
  }, [guestData, setGuestData])

  const adjustedPage = page === 1 && addedReservations.length > 0 ? 1 : page
  const normalQuery = useReservations(adjustedPage, reservationFilter)
  const guestQuery = useGuestReservations(guestData?.data?.id)

  const { data, isLoading, isError, isFetching } = isGuestMode 
    ? guestQuery 
    : normalQuery


  const displayData = page === 1 && addedReservations.length > 0 && data
    ? {
        count: data.count,
        reservations: [
          ...addedReservations,
          ...data.reservations
        ]
      }
    : data

  useEffect(() => {
    setCurrentPage(0)
  }, [reservationFilter])

  if (isError) {
    return <div className='text-center py-10 text-red-500'>{t('errorLoadingReservations')}</div>
  }

  if (displayData && displayData.count === 0 && addedReservations.length === 0) {
    return <NoReservations />
  }

  const totalPages = displayData ? Math.ceil(displayData.count / ITEMS_PER_PAGE) : 0

  return (
    <>
      <div className='flex flex-col gap-3 mb-6 relative min-h-[400px]'>
        {isFetching && displayData && (
          <div className='absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg'>
              <Spinner /> {t('loading')}
          </div>
        )}
        
        {displayData?.reservations.map((item: Reservation, index: number) => (<ReservationCard key={item.id + index} reservation={item} />))}
        
        {!displayData && isLoading && (
          <div className='flex flex-1 items-center justify-center h-[400px]'>
            <div className='flex items-center gap-2'>
              <Spinner /> {t('loading')}
            </div>
          </div>
        )}
      </div>
      {!isGuestMode && totalPages > 1 && (
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
  const t = useTranslations('profile')
  return (
    <div className='flex items-center justify-center w-full flex-col flex-1'>
      <Image src="/images/no-reservations.svg" alt="no reservations" width={166} height={250} priority className='w-[166px] h-[250px]' />
      <p className='text-sm text-gray-500 mb-5'>{t('noRoomsBooked')}</p>
      <Link href='/rooms'>
        <Button className=' h-[45px] w-[300px]' >{t('bookNow')}</Button>
      </Link>
    </div>
  )
}
