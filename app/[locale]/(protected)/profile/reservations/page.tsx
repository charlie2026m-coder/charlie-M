'use client'
import { useProfileStore } from '@/store/useProfile'
import ReservationsTable from './components/Table'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAddedReservations } from '@/app/hooks/useReservations'
import { filterReservationsByStatus } from '@/lib/utils'
import { Input } from '@/app/_components/ui/input'
import { Button } from '@/app/_components/ui/button'
import ReservationIdDialog from '../components/ReservationIdDialog'
import { FiSearch, FiPlus } from 'react-icons/fi'

const Reservations = () => {
  const { data: addedReservations = [] } = useAddedReservations()
  const t = useTranslations('profile')
  const { reservationFilter } = useProfileStore()
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [search, setSearch] = useState('')
  // Opt-in demo data via ?demo=1 (read from the URL after mount to avoid the
  // useSearchParams Suspense requirement). Never on in normal use.
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    setIsGuestMode(sessionStorage.getItem('guestMode') === 'true')
    setDemoMode(new URLSearchParams(window.location.search).get('demo') === '1')
  }, [])

  const filteredAddedReservations = filterReservationsByStatus(addedReservations, reservationFilter)

  const title = {
    "All": t('allReservations'),
    "Ongoing" : t('ongoingReservations'),
    'Upcoming' : t('upcomingReservations'),
    'Completed' : t('completedReservations'),
    'Canceled' : t('canceledReservations'),
  } as const

  return (
    <div className='flex flex-col flex-1  p-3 lg:p-[30px] '>
      <div className='flex flex-col gap-4 mb-5'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div className='flex items-center gap-2 font-semibold text-2xl'>
            {isGuestMode ? t('yourBooking') : title[reservationFilter as keyof typeof title]}
            {demoMode && (
              <span className='rounded-full bg-blue/20 text-mute text-xs font-semibold px-2 py-0.5'>Demo</span>
            )}
          </div>
          {!isGuestMode && (
            <ReservationIdDialog
              trigger={
                <Button className='h-10 rounded-full px-4 gap-2 whitespace-nowrap'>
                  <FiPlus className='size-4' />
                  {t('addViaReservationIdTitle')}
                </Button>
              }
            />
          )}
        </div>
        {!isGuestMode && (
          <div className='relative w-full max-w-md'>
            <FiSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brown' />
            <Input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className='h-10 rounded-full pl-9'
            />
          </div>
        )}
      </div>
      <ReservationsTable addedReservations={filteredAddedReservations} searchQuery={search} demoMode={demoMode} />
    </div>
  )
}

export default Reservations;
