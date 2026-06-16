'use client'
import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import { Link } from '@/navigation'
import { useState, useEffect, useMemo } from 'react'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import ReservationCard from '../components/ReservationCard'
import { useReservations, useGuestReservations } from '@/app/hooks/useReservations'
import { useProfileStore } from '@/store/useProfile'
import { Spinner } from '@/app/_components/ui/spinner'
import { Reservation } from '@/types/apaleo'
import { useTranslations } from 'next-intl'
import { searchReservations } from '@/lib/utils'

const ITEMS_PER_PAGE = 3
// Pull the guest's full reservation list in one request so search and
// pagination run client-side across all of them (a guest has only a handful).
const FETCH_ALL_SIZE = 50

interface ReservationsTableProps {
  addedReservations?: any[]
  searchQuery?: string
}

const ReservationsTable = ({ addedReservations = [], searchQuery = '' }: ReservationsTableProps) => {
  const t = useTranslations('profile')
  const [currentPage, setCurrentPage] = useState(0)
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

  // Fetch the whole list up front (page 1, large size); search + paging happen
  // client-side below so a guest can find any booking, not just the open page.
  const normalQuery = useReservations(1, reservationFilter, FETCH_ALL_SIZE)
  const guestQuery = useGuestReservations(guestData?.id)
  const { data, isLoading, isError, isFetching } = isGuestMode ? guestQuery : normalQuery

  // Merge locally-added reservations with the ones found by the account email,
  // de-duplicate by id, then apply the free-text search.
  const matchedReservations = useMemo(() => {
    const serverReservations: Reservation[] = data?.reservations ?? []
    const merged = isGuestMode ? serverReservations : [...addedReservations, ...serverReservations]
    const seen = new Set<string>()
    const deduped = merged.filter((r: any) => {
      if (!r?.id) return true
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    return searchReservations(deduped, searchQuery)
  }, [data, addedReservations, isGuestMode, searchQuery])

  // Any change to the filter or search resets to the first page.
  useEffect(() => {
    setCurrentPage(0)
  }, [reservationFilter, searchQuery])

  if (isError) {
    return <div className='text-center py-10 text-red-500'>{t('errorLoadingReservations')}</div>
  }

  if (!data && isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center h-[400px]'>
        <div className='flex items-center gap-2'>
          <Spinner /> {t('loading')}
        </div>
      </div>
    )
  }

  const totalAvailable = (data?.reservations?.length ?? 0) + (isGuestMode ? 0 : addedReservations.length)

  // The guest has no reservations at all.
  if (data && totalAvailable === 0) {
    return <NoReservations />
  }

  // The guest has reservations, but the current search matches none.
  if (matchedReservations.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center w-full flex-1 py-16 text-center'>
        <p className='text-sm text-gray-500'>{t('searchNoResults')}</p>
      </div>
    )
  }

  const totalPages = Math.ceil(matchedReservations.length / ITEMS_PER_PAGE)
  const pageItems = matchedReservations.slice(
    currentPage * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  )

  return (
    <>
      <div className='flex flex-col gap-3 mb-6 relative min-h-[400px]'>
        {isFetching && (
          <div className='absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg'>
            <Spinner /> {t('loading')}
          </div>
        )}

        {pageItems.map((item: Reservation, index: number) => (
          <ReservationCard key={item.id + index} reservation={item} />
        ))}
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
