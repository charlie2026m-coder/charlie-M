import Dot from '@/app/_components/ui/dot'
import Amenities from '../../components/Amenities'
import { Beds24RoomType } from '@/types/beds24'
import { BsFillPersonFill } from 'react-icons/bs';
import { GiHouseKeys } from "react-icons/gi";

const RoomContent = ({room}: {room: Beds24RoomType}) => {
  const isBalcony = room.hasBalcony;
  return (
    <>
      <div className='flex justify-between mb-5 items-start gap-2'>
        <h2 className='text-[40px] font-semibold w-4/5 leading-[0.95]'>{room.name}</h2>
        <div className='text-brown bg-white/80 shadow-lg p-2.5 rounded-full'>{room.roomType}</div>
      </div>
      <div className='flex items-center gap-1 pb-3 mb-8 w-full border-b'>
      <span className='text-dark text-sm flex items-center gap-1'> <BsFillPersonFill className='size-4 text-blue' />{room.people} Max.</span>
        <Dot size={7} color='blue' />
        <span className='text-dark text'>{room.roomSize}m²</span>
        <Dot size={7} color='blue' />
        <span className='text-dark text'>{room.roomType}</span>
        {isBalcony && <>
          <Dot size={7} color='blue' />
          <span className='text-dark text'>Balcony</span>
        </>}
        {room.unitsAvailable?.total ? (
          <div className=' flex text-brown items-center gap-1 ml-auto '>
            <GiHouseKeys />  We have <span className='font-bold'>{room.unitsAvailable?.free}</span> left 
          </div>
        ) : null}
      </div>
      <Amenities title={false}/>
      <p className='text-dark text-sm inter mb-3 mt-[30px]'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p className='text-dark text-sm inter '>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p className='text-dark text-sm inter mb-[46px]'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </>
  )
}

export default RoomContent