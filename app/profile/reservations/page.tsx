'use client'
import { useProfileStore } from '@/store/useProfile'
import ReservationsTable from './components/Table'

const Reservations = () => {
  const { reservationFilter } = useProfileStore() 
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
        {title[reservationFilter as keyof typeof title]}
      </div>
      <ReservationsTable />
    </div>
  )
}

export default Reservations;


