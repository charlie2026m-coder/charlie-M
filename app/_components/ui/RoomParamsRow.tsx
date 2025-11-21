import { BsFillPersonFill } from 'react-icons/bs'
import { Beds24RoomType } from '@/types/beds24'
import Dot from './dot'

const RoomParamsRow = ({item }: { item: Beds24RoomType }) => {
  return (
    <div className='flex items-center gap-1'>
      <span className='text-dark text-sm flex items-center gap-1'> <BsFillPersonFill className='size-4 text-blue' />{item.people} Max.</span>
      <Dot size={7} color='blue' />
      <span className='text-dark text'>{item.roomSize}m²</span>
      <Dot size={7} color='blue' />
      <span className='text-dark text'>{item.roomType}</span>
      {item.hasBalcony && <>
        <Dot size={7} color='blue' />
        <span className='text-dark text'>Balcony</span>
      </>}
    </div>
  )
}

export default RoomParamsRow