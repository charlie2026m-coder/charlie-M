'use client'
import { useProfileStore } from '@/store/useProfile'
import ReservationsTable from './components/Table'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { fetchAddedReservations } from './utils/fetchAddedReservations'

const Reservations = () => {
  const { data: addedReservations = [] } = useQuery({
    queryKey: ['added-reservations'],
    queryFn: fetchAddedReservations,
  })
  const t = useTranslations('profile')
  const { reservationFilter } = useProfileStore() 
  const [isGuestMode, setIsGuestMode] = useState(false)
  
  useEffect(() => {
    setIsGuestMode(localStorage.getItem('guestMode') === 'true')
  }, [])
  
  const title = {
    "All": t('allReservations'),
    "Added": t('addedReservations'),
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
      <ReservationsTable addedReservations={addedReservations} />
    </div>
  )
}

export default Reservations;


