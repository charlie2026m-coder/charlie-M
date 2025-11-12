import Amenities from './components/Amenities'
import VideoPlayer from '../_components/Home/VideoPlayer'
import CheckInForm from '../_components/Home/CheckInForm'
import Filters from './components/Filters'
import RoomsList from './components/RoomsList'
import dayjs from 'dayjs'
import { getPath } from '@/lib/utils'

async function getRooms( from: string | undefined, to: string | undefined, adults: string | undefined, children: string | undefined ) {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const today = dayjs().format('YYYY-MM-DD')
  const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')
  const queryString = getPath({ from: from || today, to: to || nextYear, adults: adults || '1', children: children || '0' })
  const res = await fetch(`${url}/api/rooms?${queryString}`, {
    cache: 'no-store' 
  })
  if (!res.ok) {
    throw new Error('Failed to fetch rooms')
  }
  return res.json()
}

interface SearchParams {
  from?: string
  to?: string
  adults?: string
  children?: string
}

const RoomsPage = async ({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) => {
  const { from, to, adults, children } = await searchParams;
  const rooms = await getRooms(from, to, adults, children)
  
  return (
    <section className='flex flex-col container px-[100px] pt-10'>
      <h1 className='text-6xl font-bold jakarta mb-6'>Charlie M — Rooms</h1>

      <Amenities /> 
      <p className='text-dark text-sm inter mb-3 mt-9'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p className='text-dark text-sm inter mb-9'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <div className='h-[500px] relative mb-8'>
        <VideoPlayer 
          videoSrc="https://www.youtube.com/watch?v=_Yhyp-_hX2s&list=RD_Yhyp-_hX2s&start_radio=1" 
          className="aspect-video w-full h-[430px]" 
        />
        <CheckInForm 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px]"
          params={{ from, to, adults, children }}
        />
      </div>
      <Filters />
      <RoomsList rooms={rooms} params={{ from, to, adults, children }} />
    </section>
  )
}

export default RoomsPage