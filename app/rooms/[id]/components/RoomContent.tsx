import Dot from '@/app/_components/ui/dot'
import Amenities from '../../components/Amenities'
import { Beds24RoomType } from '@/types/beds24'
import { GiHouseKeys } from "react-icons/gi";
import TextReadMore from '@/app/_components/ui/TextReadMore';
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow';

const RoomContent = ({room}: {room: Beds24RoomType}) => {
  return (
    <>
      <div className='flex justify-between mb-5 items-start gap-2'>
        <h2 className='text-[30px] md:text-[40px] font-semibold w-4/5 leading-[0.95]'>{room.name}</h2>
        <div className='text-brown bg-white/80 shadow-lg p-2.5 rounded-full'>{room.roomType}</div>
      </div>
      <div className='pb-3 mb-8 w-full border-b flex flex-col md:flex-row  justify-between'>
        <RoomParamsRow item={room} />
        {room.unitsAvailable?.total ? (
          <div className=' flex text-brown items-center gap-1 ml-auto '>
            <GiHouseKeys />  We have <span className='font-bold'>{room.unitsAvailable?.free}</span> left 
          </div>
        ) : null}
      </div>
      <Amenities title={false}/>
      <TextReadMore 
        text='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' 
        lines={3}
      />
    </>
  )
}

export default RoomContent