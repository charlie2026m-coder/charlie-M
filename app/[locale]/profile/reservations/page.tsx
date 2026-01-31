'use client'
import { useProfileStore } from '@/store/useProfile'
import ReservationsTable from './components/Table'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const Reservations = () => {
  const t = useTranslations('profile')
  const { reservationFilter } = useProfileStore() 
  const [isGuestMode, setIsGuestMode] = useState(false)
  
  useEffect(() => {
    setIsGuestMode(localStorage.getItem('guestMode') === 'true')
  }, [])
  
  const title = {
    "All": t('allReservations'),
    "Ongoing" : t('ongoingReservations'),
    'Upcoming' : t('upcomingReservations'),
    'Completed' : t('completedReservations'),
    'Canceled' : t('canceledReservations'),
  } as const
  
  return (
    <div className='flex flex-col flex-1  p-3 lg:p-[30px] '>
      <div className='flex items-center gap-2 font-semibold text-2xl mb-5'>
        {isGuestMode ? t('yourBooking') : title[reservationFilter as keyof typeof title]}
      </div>
      <ReservationsTable />
    </div>
  )
}

export default Reservations;


