import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/_components/Home/PhotoSlider'
import Link from 'next/link'
import { getPath, getPriceData } from '@/lib/utils'
import { Beds24RoomType, UrlParams } from '@/types/beds24'
import { GiHouseKeys } from "react-icons/gi";
import { BsFillPersonFill } from 'react-icons/bs'
import TextReadMore from '@/app/_components/ui/TextReadMore'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'

const RoomCard = ({ 
  params,
  room,
}: { 
  params: UrlParams,
  room: Beds24RoomType
}) => {
  const images = [
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
  ]
  const queryString = getPath({ from: params.from, to: params.to, adults: params.adults, children: params.children })
  const { price, priceText } = getPriceData({ params, room })

  return (
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} category={room.roomType} />
      <div className='flex flex-col p-4 px-6 pb-6 h-full'>
        <div className='gap-5'>
          <div className='flex flex-col ' >
            <h2 className='text-xl font-medium jakarta mb-3'>{room.name}</h2>

            <div className='flex items-center gap-1 mb-3'>
              <RoomParamsRow item={room} />
            </div>
          </div>
          <div className='flex lg:flex-col xl:flex-row xl:items-center  justify-between gap-3 mb-3'>
            <div className='text-brown flex items-center gap-1'><BsFillPersonFill className='size-4 text-brown' />{priceText}</div>
            <div className='text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2 self-end'>€{price}</div>
          </div>


        </div>
          <TextReadMore 
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
            lines={2}
          />

        {room.unitsAvailable?.total ? (
          <div className='text-sm flex text-brown items-center gap-1 w-full justify-end mb-2 pr-2 mt-auto'>
            <GiHouseKeys />  We have {room.unitsAvailable?.free}  left 
          </div>
        ) : null}
        
          <Link href={`/rooms/${room.id}?${queryString}`}>  
            <Button className='h-[55px] w-full'>Explore and Book</Button>
          </Link>
      </div>
    </div>
  )
}

export default RoomCard