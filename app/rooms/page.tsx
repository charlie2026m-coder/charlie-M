import Amenities from './components/Amenities'
import VideoPlayer from '../_components/Home/VideoPlayer'
import CheckInForm from '../_components/Home/CheckInForm'
import Filters from './components/Filters'
import FiltersMobile from './components/FiltersMobile'
import RoomsList from './components/RoomsList'
import { getRoomsData } from '@/services/getRoomsData'
import { UrlParams } from '@/types/beds24'
import ErrorCard from '@/app/rooms/components/ErrorCard'
import NotFoundCard from './[id]/components/NotFoundCard'
import TextReadMore from '../_components/ui/TextReadMore'

const RoomsPage = async ({  searchParams } : {  searchParams: UrlParams  }) => {
  const { from, to, adults, children } = await searchParams;
  const rooms = await getRoomsData(from, to, adults, children)

  // if ('error' in rooms) return <ErrorCard />


  return (
    <section className='flex flex-col container px-4 md:px-10 xl:px-[100px] pt-10'>
      <h1 className='text-[35px] md:text-6xl font-bold jakarta mb-6'>Charlie M — Rooms</h1>

      <TextReadMore 
        text="Our rooms at Charlie M are designed to feel inviting from the moment you arrive. Modern interiors, great beds, and thoughtful amenities create a calm space to unwind after a day in the city. Each room category has its own character — from private balconies to shared terraces — so you can choose the one that fits your stay." 
        lines={3} 
        className='mb-7'
      />  

      <div className="w-full mb-[30px] md:mb-[85px] relative">
      <VideoPlayer 
        videoSrc="https://www.youtube.com/watch?v=_Yhyp-_hX2s&list=RD_Yhyp-_hX2s&start_radio=1" 
        className="aspect-video w-full h-[670px] md:h-[510px]" 
      />
      <CheckInForm 
        className="absolute bottom-8 md:bottom-[-60px] left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px]"
        params={{ from, to, adults, children }}  
      />
    </div>
      <Filters />
      <FiltersMobile />
      <Amenities />
      {('error' in rooms) 
        ? <ErrorCard />
        : rooms.length === 0
          ? <NotFoundCard text='No rooms found' />
          : <RoomsList rooms={rooms} params={{ from, to, adults, children }} />
      } 
    </section>
  )
}

export default RoomsPage