import { Link } from '@/navigation'

interface NoCapacityWarningProps {
  totalAdults: number
  from?: string
  to?: string
  adults?: string
  children?: string
}

const NoCapacityWarning = ({
  totalAdults,
  from,
  to,
  adults,
  children
}: NoCapacityWarningProps) => {
  return (
    <div className='flex items-center justify-center flex-col col-span-2 xl:col-span-3'>
      <h2 className='text-2xl font-bold text-dark mb-4'>Not Enough Rooms Available</h2>
      <p className='text-mute mb-6'>
        Unfortunately, we don't have enough available rooms for {totalAdults} {totalAdults === 1 ? 'guest' : 'guests'}.
       
      </p>
      <Link 
        href={`/rooms${from && to ? `?from=${from}&to=${to}&adults=${adults}&children=${children || 0}` : ''}`}
        className='inline-block bg-blue text-white px-6 py-3 rounded-full hover:bg-blue/80 transition-colors'
      >
        View All Rooms
      </Link>
    </div>
  )
}

export default NoCapacityWarning
