import Amenities from '../../components/Amenities'
import { GiHouseKeys } from "react-icons/gi";
import TextReadMore from '@/app/_components/ui/TextReadMore';
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow';
import { RoomOffer } from '@/types/offers'

const RoomContent = ({ room }: { room: RoomOffer }) => {
  return (
    <>
      <div className='flex flex-col-reverse md:flex-row justify-between mb-5 items-start gap-2'>
        <h2 className='text-[30px] md:text-[40px] font-semibold w-4/5 leading-[0.95]'>{room.name}</h2>
      </div>
      <div className='pb-3 mb-5 w-full border-b flex flex-col md:flex-row  justify-between'>
        <RoomParamsRow attributes={room.attributes} maxPersons={room.maxPersons} size={room.size} />
        {room.availableUnits > 0 ? (
          <div className=' flex text-red items-center gap-1 ml-auto '>
            <GiHouseKeys />  We have <span className='font-bold'>{room.availableUnits}</span> left 
          </div>
        ) : null}
      </div>
      <Amenities/>
      <TextReadMore 
        className='mb-5'
        textClassName='text-dark text-base'
        text={room.description} 
        lines={3}
      />
      <div className='flex flex-col gap-5 rounded-[20px] px-5 py-4 bg-blue/20 mb-9'>
        <h3 className='font-semibold'>Please note:</h3>
        <p className='text-dark text-md mb-2 '>
        Each room in our historic property has its own individual layout. While every room in this category offers the same comfort level and features, small variations in size or shape are to be expected. Because of this, the room you receive may differ slightly from the photos shown, but it will always match the quality and category you booked.
        </p>
      </div>

    </>
  )
}

export default RoomContent