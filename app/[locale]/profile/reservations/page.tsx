'use client'
import { useProfileStore } from '@/store/useProfile'
import ReservationsTable from './components/Table'
import { useEffect, useState } from 'react'

const Reservations = () => {
  const { reservationFilter } = useProfileStore() 
  const [isGuestMode, setIsGuestMode] = useState(false)
  
  useEffect(() => {
    setIsGuestMode(localStorage.getItem('guestMode') === 'true')
  }, [])
  
  const title = {
    "All": 'All Reservations',
    "Ongoing" : 'Ongoing Reservations',
    'Upcoming' : 'Upcoming Reservations',
    'Completed' : 'Completed Reservations',
    'Canceled' : 'Canceled Reservations',
  } as const
  
  return (
    <div className='flex flex-col flex-1 px-3 lg:px-[30px]'>
      <div className='flex items-center gap-2 font-semibold text-2xl mb-5'>
        {isGuestMode ? 'Your Booking' : title[reservationFilter as keyof typeof title]}
      </div>
      <ReservationsTable />
    </div>
  )
}

export default Reservations;


